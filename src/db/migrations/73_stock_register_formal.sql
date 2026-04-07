do $$
begin
  if not exists (select 1 from pg_type where typname = 'shareholder_entity_type') then
    create type shareholder_entity_type as enum ('unknown', 'person', 'company');
  end if;
end
$$;

alter table if exists shareholders
  add column if not exists shareholder_no int,
  add column if not exists entity_type shareholder_entity_type not null default 'unknown',
  add column if not exists birth_date date,
  add column if not exists national_id text,
  add column if not exists orgnr text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text not null default 'NO';

create sequence if not exists shareholder_no_seq;

create unique index if not exists shareholders_shareholder_no_unique on shareholders(shareholder_no) where shareholder_no is not null;

create or replace function stock_assign_shareholder_no()
returns trigger as $$
begin
  if new.shareholder_no is null then
    new.shareholder_no := nextval('shareholder_no_seq');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists shareholders_assign_no on shareholders;
create trigger shareholders_assign_no
before insert on shareholders
for each row execute function stock_assign_shareholder_no();

do $$
declare
  next_no int;
  assigned_count int;
  holding_id uuid;
begin
  select count(*) into assigned_count from shareholders where shareholder_no is not null;
  if assigned_count = 0 then
    select holding_shareholder_id into holding_id from stock_settings where id = 1;
    if holding_id is not null then
      update shareholders set shareholder_no = 1 where id = holding_id and shareholder_no is null;
    end if;
  end if;

  select coalesce(max(shareholder_no), 0) + 1 into next_no from shareholders;
  perform setval('shareholder_no_seq', greatest(next_no, 1), false);

  update shareholders
  set shareholder_no = nextval('shareholder_no_seq')
  where shareholder_no is null;
end
$$;

create or replace function stock_ensure_shareholder_for_user(target_user_id uuid)
returns uuid as $$
declare
  existing uuid;
  u_email text;
  u_name text;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  select email into u_email from auth.users where id = target_user_id;
  select full_name into u_name from profiles where id = target_user_id;

  u_email := nullif(trim(coalesce(u_email, '')), '');
  u_name := nullif(trim(coalesce(u_name, '')), '');
  if u_name is null then
    u_name := coalesce(u_email, 'Ukjent aksjonær');
  end if;

  select id into existing from shareholders where user_id = target_user_id limit 1;
  if existing is not null then
    update shareholders
    set navn = u_name,
        email = coalesce(u_email, email)
    where id = existing
      and (navn is distinct from u_name or (u_email is not null and email is distinct from u_email));
    return existing;
  end if;

  insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris)
  values (target_user_id, u_name, u_email, 0, 0)
  returning id into existing;

  return existing;
end;
$$ language plpgsql security definer set search_path = public;

alter table if exists shareholders
  drop constraint if exists shareholders_national_id_format,
  add constraint shareholders_national_id_format check (national_id is null or national_id ~ '^[0-9]{11}$');

alter table if exists shareholders
  drop constraint if exists shareholders_orgnr_format,
  add constraint shareholders_orgnr_format check (orgnr is null or orgnr ~ '^[0-9]{9}$');

alter table if exists shareholders
  drop constraint if exists shareholders_postal_code_format,
  add constraint shareholders_postal_code_format check (postal_code is null or postal_code ~ '^[0-9]{4}$');

create table if not exists stock_company_info (
  id int primary key default 1,
  company_name text not null default 'AI Innovate AS',
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'NO',
  orgnr text,
  incorporation_date date,
  share_capital numeric,
  par_value numeric,
  default_share_class text not null default 'A',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table if exists stock_company_info
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text;

update stock_company_info set country = coalesce(country, 'NO') where id = 1;

alter table if exists stock_company_info
  alter column country set default 'NO',
  alter column country set not null;

insert into stock_company_info(id)
values (1)
on conflict (id) do nothing;

create table if not exists stock_share_lots (
  id uuid default gen_random_uuid() primary key,
  shareholder_id uuid references shareholders(id) on delete cascade not null,
  share_class text not null default 'A',
  start_no int not null check (start_no > 0),
  end_no int not null check (end_no >= start_no),
  acquired_at timestamptz default timezone('utc'::text, now()) not null,
  source_order_id uuid references stock_orders(id) on delete set null,
  source_tx_id uuid references transactions(id) on delete set null
);

create index if not exists stock_share_lots_shareholder_idx on stock_share_lots(shareholder_id, share_class, start_no);

create or replace function stock_merge_adjacent_lots(target_shareholder_id uuid, share_class_input text)
returns void as $$
declare
  pair record;
begin
  loop
    select a.id as a_id, b.id as b_id, b.end_no as b_end
    into pair
    from stock_share_lots a
    join stock_share_lots b
      on b.shareholder_id = a.shareholder_id
     and b.share_class = a.share_class
     and b.start_no = a.end_no + 1
    where a.shareholder_id = target_shareholder_id
      and a.share_class = share_class_input
    order by a.start_no asc
    limit 1;

    if pair.a_id is null then
      exit;
    end if;

    update stock_share_lots set end_no = pair.b_end where id = pair.a_id;
    delete from stock_share_lots where id = pair.b_id;
  end loop;
end;
$$ language plpgsql security definer;

alter table if exists stock_company_info enable row level security;
alter table if exists stock_share_lots enable row level security;

create or replace function stock_transfer_share_lots(
  from_shareholder_id uuid,
  to_user_id uuid,
  share_count_input int,
  share_class_input text,
  order_id_input uuid,
  tx_id_input uuid
)
returns void as $$
declare
  remaining int;
  take int;
  lot record;
  lot_size int;
  transfer_start int;
  transfer_end int;
  buyer_sh uuid;
begin
  if share_count_input is null or share_count_input <= 0 then
    raise exception 'invalid share count';
  end if;
  if from_shareholder_id is null then
    raise exception 'missing from shareholder';
  end if;

  buyer_sh := stock_ensure_shareholder_for_user(to_user_id);
  remaining := share_count_input;

  while remaining > 0 loop
    select id, start_no, end_no
    into lot
    from stock_share_lots
    where shareholder_id = from_shareholder_id and share_class = share_class_input
    order by start_no asc
    limit 1
    for update;

    if lot.id is null then
      raise exception 'not enough share lots';
    end if;

    lot_size := lot.end_no - lot.start_no + 1;
    take := least(remaining, lot_size);
    transfer_start := lot.start_no;
    transfer_end := lot.start_no + take - 1;

    if take = lot_size then
      delete from stock_share_lots where id = lot.id;
    else
      update stock_share_lots set start_no = lot.start_no + take where id = lot.id;
    end if;

    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no, source_order_id, source_tx_id)
    values (buyer_sh, share_class_input, transfer_start, transfer_end, order_id_input, tx_id_input);

    remaining := remaining - take;
  end loop;

  perform stock_merge_adjacent_lots(buyer_sh, share_class_input);
end;
$$ language plpgsql security definer;

create or replace function stock_rebuild_share_lots()
returns void as $$
declare
  holding_id uuid;
  total int;
  t record;
  from_sh uuid;
begin
  truncate table stock_share_lots;

  select holding_shareholder_id, total_shares into holding_id, total
  from stock_settings where id = 1;

  if holding_id is null then
    raise exception 'holding not configured';
  end if;

  if total is null or total <= 0 then
    total := 0;
  end if;

  if total > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding_id, 'A', 1, total);
  end if;

  for t in
    select id, type, buyer, seller, antall, dato, order_id
    from transactions
    where type in ('emisjon', 'videresalg')
    order by dato asc, id asc
  loop
    if t.type = 'emisjon' then
      from_sh := holding_id;
    else
      from_sh := stock_ensure_shareholder_for_user(t.seller);
    end if;

    perform stock_transfer_share_lots(from_sh, t.buyer, t.antall, 'A', t.order_id, t.id);
  end loop;
end;
$$ language plpgsql security definer;

create or replace function stock_admin_rebuild_share_lots(admin_user_id uuid, admin_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  caller_role := coalesce(nullif(auth.role(), ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
  if caller_role <> 'service_role' then
    raise exception 'access denied';
  end if;

  perform stock_rebuild_share_lots();
  perform stock_log(admin_user_id, 'share_lots_rebuild', admin_ip, '{}'::jsonb);
end;
$$;

revoke all on function stock_admin_rebuild_share_lots(uuid, text) from public;
revoke all on function stock_admin_rebuild_share_lots(uuid, text) from anon;
revoke all on function stock_admin_rebuild_share_lots(uuid, text) from authenticated;
grant execute on function stock_admin_rebuild_share_lots(uuid, text) to service_role;

create or replace function stock_admin_init_setup(total_shares_input integer)
returns void as $$
declare
  holding uuid;
begin
  if total_shares_input is null or total_shares_input < 0 then
    raise exception 'total_shares must be >= 0';
  end if;

  select id into holding from shareholders where user_id is null and lower(navn) = lower('AI Innovate Holding AS') limit 1;
  if holding is null then
    insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris)
    values (null, 'AI Innovate Holding AS', 'holding@aiinnovate.no', total_shares_input, 0)
    returning id into holding;
  else
    update shareholders set antall_aksjer = total_shares_input, gjennomsnittspris = 0, siste_oppdatering = timezone('utc'::text, now()) where id = holding;
  end if;

  insert into stock_settings(id, total_shares, holding_shareholder_id)
  values (1, total_shares_input, holding)
  on conflict (id) do update
  set total_shares = excluded.total_shares,
      holding_shareholder_id = excluded.holding_shareholder_id,
      updated_at = timezone('utc'::text, now());

  truncate table stock_share_lots;
  if total_shares_input > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding, 'A', 1, total_shares_input);
  end if;
end;
$$ language plpgsql security definer;

create or replace function stock_admin_approve_order(order_id_input uuid, admin_user_id uuid, admin_ip text)
returns void as $$
declare
  o record;
  s record;
  listing record;
  holding_id uuid;
  tx_id uuid;
  seller_sh uuid;
begin
  select * into o from stock_orders where id = order_id_input for update;
  if o.id is null then
    raise exception 'order not found';
  end if;
  if o.status <> 'pending_approval' then
    raise exception 'order not pending approval';
  end if;

  select * into s from stock_settings where id = 1;

  if o.type = 'emission' then
    select holding_shareholder_id into holding_id from stock_settings where id = 1;
    if holding_id is null then
      raise exception 'holding not configured';
    end if;

    if o.offering_id is not null then
      update stock_offerings
      set available_shares = available_shares - o.share_count
      where id = o.offering_id and available_shares >= o.share_count;
      if not found then
        raise exception 'not enough offering shares';
      end if;
    end if;

    insert into transactions(buyer, seller, antall, pris, type, order_id, fee_amount, total_amount)
    values (o.buyer_id, null, o.share_count, o.price_per_share, 'emisjon', o.id, o.fee_amount, o.total_amount)
    returning id into tx_id;

    perform stock_transfer_share_lots(holding_id, o.buyer_id, o.share_count, 'A', o.id, tx_id);
  elsif o.type = 'resale' then
    select * into listing from stock_listings where id = o.listing_id for update;
    if listing.id is null then
      raise exception 'listing not found';
    end if;
    if listing.status <> 'active' then
      raise exception 'listing not active';
    end if;
    if listing.share_count < o.share_count then
      raise exception 'not enough shares in listing';
    end if;

    update stock_listings
    set share_count = share_count - o.share_count,
        status = case when share_count - o.share_count <= 0 then 'sold' else status end
    where id = listing.id;

    insert into transactions(buyer, seller, antall, pris, type, order_id, fee_amount, total_amount)
    values (o.buyer_id, listing.seller_id, o.share_count, o.price_per_share, 'videresalg', o.id, o.fee_amount, o.total_amount)
    returning id into tx_id;

    seller_sh := stock_ensure_shareholder_for_user(listing.seller_id);
    perform stock_transfer_share_lots(seller_sh, o.buyer_id, o.share_count, 'A', o.id, tx_id);
  else
    raise exception 'unsupported order type';
  end if;

  update stock_orders
  set status = 'approved',
      approved_at = timezone('utc'::text, now()),
      approved_by = admin_user_id,
      approved_ip = admin_ip
  where id = o.id;

  perform stock_log(admin_user_id, 'order_approved', admin_ip, jsonb_build_object('order_id', o.id, 'type', o.type));
end;
$$ language plpgsql security definer;
