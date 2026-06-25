create table if not exists public.aurora_inspection_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  created_by uuid not null,
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  hive_id uuid not null references public.hives(id) on delete cascade,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  session_key text not null,
  sequence_index integer not null default 1,
  previous_hive_id uuid references public.hives(id) on delete set null,
  inspection_date date,
  recorded_at timestamptz not null default now()
);

create index if not exists aurora_inspection_sequences_apiary_recorded_idx
  on public.aurora_inspection_sequences (apiary_id, recorded_at desc);

create index if not exists aurora_inspection_sequences_session_idx
  on public.aurora_inspection_sequences (session_key, sequence_index asc);

alter table public.aurora_inspection_sequences enable row level security;

create policy "aurora_inspection_sequences_select_access"
on public.aurora_inspection_sequences
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.account_access aa
    where aa.owner_id = aurora_inspection_sequences.owner_id
      and aa.member_id = auth.uid()
  )
);

create policy "aurora_inspection_sequences_insert_access"
on public.aurora_inspection_sequences
for insert
with check (
  created_by = auth.uid()
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.account_access aa
      where aa.owner_id = aurora_inspection_sequences.owner_id
        and aa.member_id = auth.uid()
    )
  )
);

