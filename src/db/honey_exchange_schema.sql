-- 1. Create Status Enum
create type honey_status as enum ('active', 'sold', 'pending');
create type transaction_status as enum ('pending_payment', 'paid', 'shipped', 'completed', 'cancelled');

-- 2. Create Listings Table
create table if not exists honey_listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users(id) not null,
  honey_type text not null,
  amount_kg numeric not null check (amount_kg >= 20),
  remaining_kg numeric not null check (remaining_kg >= 0),
  price_per_kg numeric not null check (price_per_kg >= 70),
  moisture_percentage numeric,
  production_year integer,
  location text,
  description text,
  status honey_status default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Transactions Table
create table if not exists honey_transactions (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references honey_listings(id) not null,
  buyer_id uuid references auth.users(id) not null,
  seller_id uuid references auth.users(id) not null,
  amount_kg numeric not null check (amount_kg >= 20),
  total_price numeric not null,
  status transaction_status default 'pending_payment',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS
alter table honey_listings enable row level security;
alter table honey_transactions enable row level security;

-- 5. Policies for Listings
-- Everyone can see active listings
create policy "Anyone can view active listings"
  on honey_listings for select
  using (status = 'active');

-- Authenticated users can create listings
create policy "Users can create listings"
  on honey_listings for insert
  with check (auth.uid() = seller_id);

-- Sellers can update their own listings
create policy "Sellers can update own listings"
  on honey_listings for update
  using (auth.uid() = seller_id);

-- 6. Policies for Transactions
-- Users can view transactions where they are buyer or seller
create policy "Users can view own transactions"
  on honey_transactions for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Authenticated users can create transactions (buy)
create policy "Users can buy honey"
  on honey_transactions for insert
  with check (auth.uid() = buyer_id);

-- Sellers and Buyers can update transaction status
create policy "Participants can update transaction status"
  on honey_transactions for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
