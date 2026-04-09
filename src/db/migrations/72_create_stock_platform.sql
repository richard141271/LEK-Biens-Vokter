-- Aksjeplattform for AI Innovate AS (aksjer.lekbie.no)

create type stock_order_type as enum ('emission', 'resale', 'import');
create type stock_order_status as enum ('draft', 'awaiting_payment', 'pending_approval', 'approved', 'rejected', 'cancelled');
create type stock_payment_method as enum ('bank', 'usdt_trc20');
create type stock_listing_status as enum ('active', 'sold', 'cancelled');

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
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  select email into u_email from auth.users where id = target_user_id;
  u_email := nullif(trim(coalesce(u_email, '')), '');

  select full_name into u_name from stock_profiles where id = target_user_id;
  u_name := nullif(trim(coalesce(u_name, '')), '');
  if u_name is null then
    u_name := coalesce(u_email, 'Ukjent aksjonær');
  end if;

  select id into existing from shareholders where user_id = target_user_id limit 1;
  if existing is not null then
    update shareholders
    set navn = u_name,
        email = coalesce(u_email, email),
        siste_oppdatering = timezone('utc'::text, now())
    where id = existing
      and (navn is distinct from u_name or (u_email is not null and email is distinct from u_email));
    return existing;
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
  seller_next_shares int;
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

select stock_admin_init_setup(100000);
