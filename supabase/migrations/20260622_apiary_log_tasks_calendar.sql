create table if not exists public.apiary_notes (
  id uuid primary key default gen_random_uuid(),
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  owner_id uuid not null,
  created_by uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists apiary_notes_apiary_id_created_at_idx
  on public.apiary_notes (apiary_id, created_at desc);

alter table public.apiary_notes enable row level security;

create policy "apiary_notes_select_access"
on public.apiary_notes
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = apiary_notes.owner_id
      and aa.member_id = auth.uid()
  )
);

create policy "apiary_notes_insert_access"
on public.apiary_notes
for insert
with check (
  created_by = auth.uid()
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.account_access aa
      where aa.owner_id = apiary_notes.owner_id
        and aa.member_id = auth.uid()
    )
  )
);

create policy "apiary_notes_delete_owner_or_author"
on public.apiary_notes
for delete
using (
  owner_id = auth.uid()
  or created_by = auth.uid()
);

create table if not exists public.lek_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  created_by uuid not null,
  apiary_id uuid references public.apiaries(id) on delete set null,
  title text not null,
  due_kind text not null default 'PICK_DATE',
  due_date date,
  kind text not null default 'APIARY_TASK',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid
);

create index if not exists lek_calendar_events_owner_due_idx
  on public.lek_calendar_events (owner_id, due_date asc nulls first, created_at desc);

alter table public.lek_calendar_events enable row level security;

create policy "lek_calendar_events_select_access"
on public.lek_calendar_events
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = lek_calendar_events.owner_id
      and aa.member_id = auth.uid()
  )
);

create policy "lek_calendar_events_insert_access"
on public.lek_calendar_events
for insert
with check (
  created_by = auth.uid()
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.account_access aa
      where aa.owner_id = lek_calendar_events.owner_id
        and aa.member_id = auth.uid()
    )
  )
);

create policy "lek_calendar_events_update_access"
on public.lek_calendar_events
for update
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = lek_calendar_events.owner_id
      and aa.member_id = auth.uid()
  )
)
with check (
  owner_id = lek_calendar_events.owner_id
);

create table if not exists public.apiary_tasks (
  id uuid primary key default gen_random_uuid(),
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  owner_id uuid not null,
  created_by uuid not null,
  title text not null,
  source text not null default 'manual',
  due_kind text not null default 'NEXT_VISIT',
  due_date date,
  calendar_event_id uuid references public.lek_calendar_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid
);

create index if not exists apiary_tasks_apiary_open_idx
  on public.apiary_tasks (apiary_id, completed_at) where completed_at is null;

create index if not exists apiary_tasks_owner_open_idx
  on public.apiary_tasks (owner_id, completed_at) where completed_at is null;

alter table public.apiary_tasks enable row level security;

create policy "apiary_tasks_select_access"
on public.apiary_tasks
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = apiary_tasks.owner_id
      and aa.member_id = auth.uid()
  )
);

create policy "apiary_tasks_insert_access"
on public.apiary_tasks
for insert
with check (
  created_by = auth.uid()
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.account_access aa
      where aa.owner_id = apiary_tasks.owner_id
        and aa.member_id = auth.uid()
    )
  )
);

create policy "apiary_tasks_update_access"
on public.apiary_tasks
for update
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = apiary_tasks.owner_id
      and aa.member_id = auth.uid()
  )
)
with check (
  owner_id = apiary_tasks.owner_id
);

create policy "apiary_tasks_delete_owner"
on public.apiary_tasks
for delete
using (
  owner_id = auth.uid()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists apiary_tasks_set_updated_at on public.apiary_tasks;
create trigger apiary_tasks_set_updated_at
before update on public.apiary_tasks
for each row
execute function public.set_updated_at();
