-- 1. Update Profiles with Wallet
alter table profiles 
add column if not exists honnycoin_balance numeric default 0;

-- 2. Wallet Transactions Table (Ledger)
create type wallet_transaction_type as enum ('deposit', 'withdrawal', 'purchase', 'sale', 'referral_bonus');

create table if not exists wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  amount numeric not null, -- Positive for credit, negative for debit
  transaction_type wallet_transaction_type not null,
  reference_id uuid, -- Link to honey_transaction or other source
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Update Listings for Trading
alter table honey_listings
add column if not exists keeper_id uuid references auth.users(id), -- The physical holder of the honey
add column if not exists original_listing_id uuid references honey_listings(id), -- If this is a resale
add column if not exists currency text default 'NOK'; -- 'NOK' or 'HC'

-- 4. RLS for Wallet
alter table wallet_transactions enable row level security;

create policy "Users can view own wallet transactions"
  on wallet_transactions for select
  using (auth.uid() = user_id);

-- Only system can insert wallet transactions (controlled via API/Functions usually, but for now we might insert from client with RLS check if we want, but better to keep it restricted. 
-- For MVP/Prototype, we allow users to insert their own "deposits" to simulate buying coins)
create policy "Users can insert own wallet transactions"
  on wallet_transactions for insert
  with check (auth.uid() = user_id);
