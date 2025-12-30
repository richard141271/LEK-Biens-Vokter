create table if not exists rentals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  hive_count integer not null default 2,
  total_price numeric not null,
  status text check (status in ('pending', 'active', 'cancelled')) default 'pending',
  contact_name text not null,
  contact_address text not null,
  contact_phone text not null,
  contact_email text not null,
  contract_signed boolean default false,
  contract_signed_at timestamptz,
  signature_text text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table rentals enable row level security;

create policy "Users can view their own rentals"
  on rentals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own rentals"
  on rentals for insert
  with check (auth.uid() = user_id);
