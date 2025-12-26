-- 1. Create Status Enum
create type honey_status as enum ('active', 'sold', 'pending');

-- 2. Create Listings Table
create table if not exists honey_listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users(id) not null,
  honey_type text not null,
  amount_kg numeric not null check (amount_kg >= 20),
  price_per_kg numeric not null check (price_per_kg >= 70),
  moisture_percentage numeric,
  production_year integer,
  location text,
  description text,
  status honey_status default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table honey_listings enable row level security;

-- 4. Policies
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
