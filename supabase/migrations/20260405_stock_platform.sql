do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_order_type') then
    create type stock_order_type as enum ('emission', 'resale', 'import');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_order_status') then
    create type stock_order_status as enum ('draft', 'awaiting_payment', 'pending_approval', 'approved', 'rejected', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_payment_method') then
    create type stock_payment_method as enum ('bank', 'usdt_trc20');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_listing_status') then
    create type stock_listing_status as enum ('active', 'sold', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'shareholder_entity_type') then
    create type shareholder_entity_type as enum ('unknown', 'person', 'company');
  end if;
end
$$;

create table if not exists stock_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists shareholders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  navn text not null,
  email text,
  antall_aksjer integer not null default 0 check (antall_aksjer >= 0),
  gjennomsnittspris numeric not null default 0 check (gjennomsnittspris >= 0),
  siste_oppdatering timestamptz default timezone('utc'::text, now()) not null
);

create unique index if not exists shareholders_user_id_unique on shareholders(user_id) where user_id is not null;

create table if not exists stock_settings (
  id int primary key default 1,
  total_shares integer not null default 100000 check (total_shares >= 0),
  holding_shareholder_id uuid references shareholders(id),
  fee_rate numeric not null default 0.02 check (fee_rate >= 0 and fee_rate <= 0.5),
  bank_account text not null default '3606 26 47110',
  usdt_trc20_address text not null default 'TJ64DHa2zLRntt2PpghTm3jMWVjv6fLvG1',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table if exists stock_settings
add column if not exists reset_timestamp timestamptz;

create table if not exists stock_offerings (
  id uuid default gen_random_uuid() primary key,
  active boolean not null default false,
  price_per_share numeric not null check (price_per_share > 0),
  available_shares integer not null default 0 check (available_shares >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists stock_listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  share_count integer not null check (share_count > 0),
  price_per_share numeric not null check (price_per_share > 0),
  status stock_listing_status not null default 'active',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists stock_orders (
  id uuid default gen_random_uuid() primary key,
  type stock_order_type not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  seller_id uuid references auth.users(id) on delete set null,
  offering_id uuid references stock_offerings(id) on delete set null,
  listing_id uuid references stock_listings(id) on delete set null,
  share_count integer not null check (share_count > 0),
  price_per_share numeric not null check (price_per_share > 0),
  fee_rate numeric not null default 0.02 check (fee_rate >= 0 and fee_rate <= 0.5),
  total_amount numeric not null check (total_amount >= 0),
  fee_amount numeric not null check (fee_amount >= 0),
  payment_method stock_payment_method not null,
  payment_reference text not null unique,
  status stock_order_status not null default 'draft',
  agreement_json jsonb,
  agreement_pdf_url text,
  signed_at timestamptz,
  signed_ip text,
  buyer_ip text,
  paid_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_ip text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  buyer uuid references auth.users(id) on delete set null,
  seller uuid references auth.users(id) on delete set null,
  antall integer not null check (antall > 0),
  pris numeric not null check (pris >= 0),
  dato timestamptz default timezone('utc'::text, now()) not null,
  type text not null check (type in ('emisjon', 'videresalg', 'import')),
  order_id uuid references stock_orders(id) on delete set null,
  fee_amount numeric not null default 0,
  total_amount numeric not null default 0
);

create table if not exists stock_audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  ip text,
  details jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create or replace function stock_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists stock_profiles_touch on stock_profiles;
create trigger stock_profiles_touch before update on stock_profiles
for each row execute function stock_touch_updated_at();

drop trigger if exists stock_offerings_touch on stock_offerings;
create trigger stock_offerings_touch before update on stock_offerings
for each row execute function stock_touch_updated_at();

drop trigger if exists stock_listings_touch on stock_listings;
create trigger stock_listings_touch before update on stock_listings
for each row execute function stock_touch_updated_at();

drop trigger if exists stock_orders_touch on stock_orders;
create trigger stock_orders_touch before update on stock_orders
for each row execute function stock_touch_updated_at();

create or replace function stock_log(actor uuid, action_name text, actor_ip text, payload jsonb)
returns void as $$
begin
  insert into stock_audit_log(actor_id, action, ip, details)
  values (actor, action_name, actor_ip, payload);
end;
$$ language plpgsql security definer;

create or replace function stock_generate_reference()
returns text as $$
declare
  s text;
begin
  s := 'AI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  return s;
end;
$$ language plpgsql;

create or replace function stock_ensure_shareholder_for_user(target_user_id uuid)
returns uuid as $$
declare
  existing uuid;
  u_email text;
  u_name text;
begin
  select id into existing from shareholders where user_id = target_user_id limit 1;
  if existing is not null then
    return existing;
  end if;

  select email into u_email from auth.users where id = target_user_id;
  select full_name into u_name from stock_profiles where id = target_user_id;
  if u_name is null or length(trim(u_name)) = 0 then
    u_name := coalesce(u_email, 'Ukjent aksjonær');
  end if;

  insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris)
  values (target_user_id, u_name, u_email, 0, 0)
  returning id into existing;

  return existing;
end;
$$ language plpgsql security definer;

create or replace function stock_apply_transaction_to_shareholders()
returns trigger as $$
declare
  buyer_sh uuid;
  seller_sh uuid;
  prev_shares int;
  prev_avg numeric;
  next_avg numeric;
  holding_id uuid;
begin
  if new.buyer is not null then
    buyer_sh := stock_ensure_shareholder_for_user(new.buyer);
    select antall_aksjer, gjennomsnittspris into prev_shares, prev_avg from shareholders where id = buyer_sh;
    next_avg := case
      when prev_shares + new.antall = 0 then 0
      else ((prev_shares::numeric * prev_avg) + (new.antall::numeric * new.pris)) / ((prev_shares + new.antall)::numeric)
    end;
    update shareholders
    set antall_aksjer = antall_aksjer + new.antall,
        gjennomsnittspris = next_avg,
        siste_oppdatering = timezone('utc'::text, now())
    where id = buyer_sh;
  end if;

  if new.type = 'emisjon' then
    select holding_shareholder_id into holding_id from stock_settings where id = 1;
    seller_sh := holding_id;
  else
    if new.seller is not null then
      seller_sh := stock_ensure_shareholder_for_user(new.seller);
    end if;
  end if;

  if seller_sh is not null then
    update shareholders
    set antall_aksjer = antall_aksjer - new.antall,
        gjennomsnittspris = case when (antall_aksjer - new.antall) <= 0 then 0 else gjennomsnittspris end,
        siste_oppdatering = timezone('utc'::text, now())
    where id = seller_sh and antall_aksjer >= new.antall;
    if not found then
      raise exception 'not enough shares for seller';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists transactions_apply_shareholders on transactions;
create trigger transactions_apply_shareholders
after insert on transactions
for each row execute function stock_apply_transaction_to_shareholders();

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
end;
$$ language plpgsql security definer;

create or replace function stock_mark_paid(order_id_input uuid, payer_ip text)
returns void as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update stock_orders
  set status = 'pending_approval',
      paid_at = timezone('utc'::text, now()),
      buyer_ip = payer_ip
  where id = order_id_input
    and buyer_id = uid
    and status = 'awaiting_payment';

  if not found then
    raise exception 'cannot mark paid';
  end if;

  perform stock_log(uid, 'order_mark_paid', payer_ip, jsonb_build_object('order_id', order_id_input));
end;
$$ language plpgsql security definer;

create or replace function stock_admin_approve_order(order_id_input uuid, admin_user_id uuid, admin_ip text)
returns void as $$
declare
  o record;
  s record;
  listing record;
  fee_rate numeric;
  holding_id uuid;
  next_available int;
begin
  select * into o from stock_orders where id = order_id_input for update;
  if o.id is null then
    raise exception 'order not found';
  end if;
  if o.status <> 'pending_approval' then
    raise exception 'order not pending approval';
  end if;

  select * into s from stock_settings where id = 1;
  fee_rate := coalesce(o.fee_rate, s.fee_rate);

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
    values (o.buyer_id, null, o.share_count, o.price_per_share, 'emisjon', o.id, o.fee_amount, o.total_amount);
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
    values (o.buyer_id, listing.seller_id, o.share_count, o.price_per_share, 'videresalg', o.id, o.fee_amount, o.total_amount);
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

create or replace function stock_admin_reject_order(order_id_input uuid, admin_user_id uuid, admin_ip text)
returns void as $$
declare
  o record;
begin
  select * into o from stock_orders where id = order_id_input for update;
  if o.id is null then
    raise exception 'order not found';
  end if;
  if o.status <> 'pending_approval' then
    raise exception 'order not pending approval';
  end if;

  update stock_orders
  set status = 'rejected',
      approved_at = timezone('utc'::text, now()),
      approved_by = admin_user_id,
      approved_ip = admin_ip
  where id = o.id;

  perform stock_log(admin_user_id, 'order_rejected', admin_ip, jsonb_build_object('order_id', o.id));
end;
$$ language plpgsql security definer;

create or replace function stock_handle_new_user()
returns trigger as $$
begin
  insert into stock_profiles (id, full_name, email)
  values (new.id, (new.raw_user_meta_data->>'full_name'), new.email)
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, stock_profiles.full_name),
      updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_stock on auth.users;
create trigger on_auth_user_created_stock
after insert on auth.users
for each row execute procedure stock_handle_new_user();

alter table stock_profiles enable row level security;
alter table shareholders enable row level security;
alter table stock_offerings enable row level security;
alter table stock_listings enable row level security;
alter table stock_orders enable row level security;
alter table transactions enable row level security;
alter table stock_audit_log enable row level security;

drop policy if exists "stock_profiles_select_own" on stock_profiles;
create policy "stock_profiles_select_own"
  on stock_profiles for select
  using (auth.uid() = id);

drop policy if exists "stock_profiles_update_own" on stock_profiles;
create policy "stock_profiles_update_own"
  on stock_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "shareholders_select_own" on shareholders;
create policy "shareholders_select_own"
  on shareholders for select
  using (auth.uid() = user_id);

drop policy if exists "stock_offerings_select_all" on stock_offerings;
create policy "stock_offerings_select_all"
  on stock_offerings for select
  using (true);

drop policy if exists "stock_listings_select_active" on stock_listings;
create policy "stock_listings_select_active"
  on stock_listings for select
  using (status = 'active' or auth.uid() = seller_id);

drop policy if exists "stock_listings_insert_own" on stock_listings;
create policy "stock_listings_insert_own"
  on stock_listings for insert
  with check (auth.uid() = seller_id);

drop policy if exists "stock_listings_update_own" on stock_listings;
create policy "stock_listings_update_own"
  on stock_listings for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "stock_orders_select_own" on stock_orders;
create policy "stock_orders_select_own"
  on stock_orders for select
  using (auth.uid() = buyer_id);

drop policy if exists "transactions_select_participants" on transactions;
create policy "transactions_select_participants"
  on transactions for select
  using (auth.uid() = buyer or auth.uid() = seller);

alter table if exists shareholders
  add column if not exists entity_type shareholder_entity_type not null default 'unknown',
  add column if not exists birth_date date,
  add column if not exists national_id text,
  add column if not exists orgnr text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text not null default 'NO';

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
  orgnr text,
  incorporation_date date,
  share_capital numeric,
  par_value numeric,
  default_share_class text not null default 'A',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

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
  delete from stock_share_lots;

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
returns void as $$
begin
  perform stock_rebuild_share_lots();
  perform stock_log(admin_user_id, 'share_lots_rebuild', admin_ip, '{}'::jsonb);
end;
$$ language plpgsql security definer;

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

  delete from stock_share_lots;
  if total_shares_input > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding, 'A', 1, total_shares_input);
  end if;
end;
$$ language plpgsql security definer;

create table if not exists stock_share_lot_events (
  id uuid default gen_random_uuid() primary key,
  from_shareholder_id uuid references shareholders(id) on delete set null,
  to_shareholder_id uuid references shareholders(id) on delete set null,
  share_class text not null default 'A',
  start_no int not null check (start_no > 0),
  end_no int not null check (end_no >= start_no),
  order_id uuid references stock_orders(id) on delete set null,
  tx_id uuid references transactions(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists stock_share_lot_events_order_idx on stock_share_lot_events(order_id);
create index if not exists stock_share_lot_events_tx_idx on stock_share_lot_events(tx_id);
create index if not exists stock_share_lot_events_from_idx on stock_share_lot_events(from_shareholder_id, share_class, start_no);
create index if not exists stock_share_lot_events_to_idx on stock_share_lot_events(to_shareholder_id, share_class, start_no);

alter table if exists stock_share_lot_events enable row level security;

create or replace function stock_transfer_share_lots_v2(
  from_shareholder_id uuid,
  to_user_id uuid,
  share_count_input int,
  share_class_input text,
  order_id_input uuid,
  tx_id_input uuid,
  log_events boolean
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

    if log_events then
      insert into stock_share_lot_events(from_shareholder_id, to_shareholder_id, share_class, start_no, end_no, order_id, tx_id)
      values (from_shareholder_id, buyer_sh, share_class_input, transfer_start, transfer_end, order_id_input, tx_id_input);
    end if;

    remaining := remaining - take;
  end loop;

  perform stock_merge_adjacent_lots(buyer_sh, share_class_input);
end;
$$ language plpgsql security definer;

create or replace function stock_transfer_share_lots(
  from_shareholder_id uuid,
  to_user_id uuid,
  share_count_input int,
  share_class_input text,
  order_id_input uuid,
  tx_id_input uuid
)
returns void as $$
begin
  perform stock_transfer_share_lots_v2(from_shareholder_id, to_user_id, share_count_input, share_class_input, order_id_input, tx_id_input, true);
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
  delete from stock_share_lots;

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

    perform stock_transfer_share_lots_v2(from_sh, t.buyer, t.antall, 'A', t.order_id, t.id, false);
  end loop;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'stock_payment_method' and e.enumlabel = 'vipps'
  ) then
    alter type stock_payment_method add value 'vipps';
  end if;
end
$$;

alter table if exists shareholders
  add column if not exists payout_bank_account text,
  add column if not exists payout_vipps text,
  add column if not exists payout_usdt_trc20 text;

create or replace function stock_admin_hard_reset(new_total_shares integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  holding uuid;
  reset_ts timestamptz;
  prev_total_shares integer;
  prev_holding_shares integer;
  actor_id uuid;
  actor_email text;
  actor_ip text;
  headers_json text;
  headers_obj jsonb;
  caller_role text;
  orders_before integer;
  tx_before integer;
  listings_before integer;
  lots_before integer;
  events_before integer;
  offerings_before integer;
begin
  caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  if caller_role <> 'service_role' then
    raise exception 'access denied';
  end if;

  if new_total_shares is null or new_total_shares < 0 then
    raise exception 'new_total_shares must be >= 0';
  end if;

  reset_ts := timezone('utc'::text, now());

  headers_json := current_setting('request.headers', true);
  if headers_json is not null and length(headers_json) > 0 then
    headers_obj := headers_json::jsonb;
    actor_email := nullif(trim(both from coalesce(headers_obj->>'x-reset-actor-email', '')), '');
    actor_ip := nullif(trim(both from coalesce(headers_obj->>'x-forwarded-for', headers_obj->>'x-real-ip', headers_obj->>'x-reset-ip', '')), '');
    if actor_ip is not null then
      actor_ip := split_part(actor_ip, ',', 1);
    end if;
    begin
      actor_id := nullif(trim(both from coalesce(headers_obj->>'x-reset-actor-id', '')), '')::uuid;
    exception when others then
      actor_id := null;
    end;
  end if;

  select total_shares into prev_total_shares from stock_settings where id = 1;
  prev_total_shares := coalesce(prev_total_shares, 0);

  select count(*) into orders_before from stock_orders;
  select count(*) into tx_before from transactions;
  select count(*) into listings_before from stock_listings;
  select count(*) into lots_before from stock_share_lots;
  select count(*) into events_before from stock_share_lot_events;
  select count(*) into offerings_before from stock_offerings;

  select id into holding
  from shareholders
  where user_id is null and lower(navn) = lower('AI Innovate Holding AS')
  limit 1;

  if holding is null then
    insert into shareholders(user_id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering)
    values (null, 'AI Innovate Holding AS', 'holding@aiinnovate.no', 0, 0, reset_ts)
    returning id into holding;
  end if;

  select antall_aksjer into prev_holding_shares from shareholders where id = holding;
  prev_holding_shares := coalesce(prev_holding_shares, 0);

  delete from stock_orders;
  delete from transactions;
  delete from stock_listings;
  delete from stock_share_lots;
  delete from stock_share_lot_events;
  delete from stock_offerings;

  update shareholders
  set antall_aksjer = 0,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts;

  update shareholders
  set antall_aksjer = new_total_shares,
      gjennomsnittspris = 0,
      siste_oppdatering = reset_ts
  where id = holding;

  delete from shareholders where id <> holding;

  insert into stock_settings(id, total_shares, holding_shareholder_id, reset_timestamp)
  values (1, new_total_shares, holding, reset_ts)
  on conflict (id) do update
  set total_shares = excluded.total_shares,
      holding_shareholder_id = excluded.holding_shareholder_id,
      reset_timestamp = excluded.reset_timestamp,
      updated_at = reset_ts;

  if new_total_shares > 0 then
    insert into stock_share_lots(shareholder_id, share_class, start_no, end_no)
    values (holding, 'A', 1, new_total_shares);
  end if;

  perform stock_log(
    actor_id,
    'hard_reset',
    actor_ip,
    jsonb_build_object(
      'actor_email', actor_email,
      'prev_total_shares', prev_total_shares,
      'prev_holding_shares', prev_holding_shares,
      'new_total_shares', new_total_shares,
      'orders_deleted', orders_before,
      'transactions_deleted', tx_before,
      'listings_deleted', listings_before,
      'share_lots_deleted', lots_before,
      'share_lot_events_deleted', events_before,
      'offerings_deleted', offerings_before,
      'reset_timestamp', reset_ts
    )
  );
end;
$$;

revoke all on function stock_admin_hard_reset(integer) from public;
revoke all on function stock_admin_hard_reset(integer) from anon;
revoke all on function stock_admin_hard_reset(integer) from authenticated;
grant execute on function stock_admin_hard_reset(integer) to service_role;

select stock_admin_init_setup(100000);
