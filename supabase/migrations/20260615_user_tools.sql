create table if not exists public.user_tools (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

drop trigger if exists user_tools_set_updated_at on public.user_tools;
create trigger user_tools_set_updated_at
before update on public.user_tools
for each row execute function public.set_updated_at();

alter table public.user_tools enable row level security;

create policy "user_tools_select_own"
on public.user_tools
for select
to authenticated
using (user_id = auth.uid());

create policy "user_tools_insert_own"
on public.user_tools
for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_tools_update_own"
on public.user_tools
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "user_tools_delete_own"
on public.user_tools
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists user_tools_enabled_idx
  on public.user_tools (user_id, enabled);
