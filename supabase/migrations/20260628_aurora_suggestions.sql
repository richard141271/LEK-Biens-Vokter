create table if not exists public.aurora_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  created_by uuid not null,
  apiary_id uuid references public.apiaries(id) on delete cascade,
  hive_id uuid references public.hives(id) on delete set null,
  inspection_id uuid references public.inspections(id) on delete set null,
  suggestion_key text not null,
  title text not null,
  rationale text not null default '',
  severity text not null default 'info',
  due_kind text not null default 'NEXT_VISIT',
  due_date date,
  task_id uuid references public.apiary_tasks(id) on delete set null,
  calendar_event_id uuid references public.lek_calendar_events(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid,
  dismissed_at timestamptz,
  dismissed_by uuid
);

create index if not exists aurora_suggestions_apiary_open_idx
  on public.aurora_suggestions (apiary_id, created_at desc)
  where accepted_at is null and dismissed_at is null;

create index if not exists aurora_suggestions_owner_open_idx
  on public.aurora_suggestions (owner_id, created_at desc)
  where accepted_at is null and dismissed_at is null;

create index if not exists aurora_suggestions_key_open_idx
  on public.aurora_suggestions (apiary_id, suggestion_key)
  where accepted_at is null and dismissed_at is null;

alter table public.aurora_suggestions enable row level security;

create policy "aurora_suggestions_select_access"
on public.aurora_suggestions
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = aurora_suggestions.owner_id
      and aa.member_id = auth.uid()
  )
);

create policy "aurora_suggestions_insert_access"
on public.aurora_suggestions
for insert
with check (
  created_by = auth.uid()
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.account_access aa
      where aa.owner_id = aurora_suggestions.owner_id
        and aa.member_id = auth.uid()
    )
  )
);

create policy "aurora_suggestions_update_access"
on public.aurora_suggestions
for update
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = aurora_suggestions.owner_id
      and aa.member_id = auth.uid()
  )
)
with check (
  owner_id = aurora_suggestions.owner_id
);

create policy "aurora_suggestions_delete_owner"
on public.aurora_suggestions
for delete
using (
  owner_id = auth.uid()
);

