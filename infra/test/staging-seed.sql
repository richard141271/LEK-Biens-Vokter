create extension if not exists pgcrypto;

create table if not exists public.test_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner uuid default auth.uid(),
  updated_at timestamptz default now()
);
alter table public.test_items enable row level security;

drop policy if exists test_items_select on public.test_items;
create policy test_items_select on public.test_items
  for select to authenticated using (true);

drop policy if exists test_items_write_own on public.test_items;
create policy test_items_write_own on public.test_items
  for insert to authenticated with check (auth.uid() = owner);

drop policy if exists test_items_update_own on public.test_items;
create policy test_items_update_own on public.test_items
  for update to authenticated using (auth.uid() = owner);

drop policy if exists test_items_delete_own on public.test_items;
create policy test_items_delete_own on public.test_items
  for delete to authenticated using (auth.uid() = owner);

create or replace function public.test_add(a int, b int)
returns int language sql immutable as $$ select a + b $$;

insert into storage.buckets (id, name, public) values
  ('inspection-images','inspection-images',false),
  ('sign-documents','sign-documents',false),
  ('meeting-audio','meeting-audio',false),
  ('product-images','product-images',true),
  ('mail-attachments','mail-attachments',false)
on conflict (id) do nothing;
