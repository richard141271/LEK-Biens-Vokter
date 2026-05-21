create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  user_name text null,
  type text not null,
  title text not null,
  description text not null,
  image_urls text[] not null default '{}'::text[],
  auto_screenshot_url text null,
  app_version text null,
  device_info jsonb null,
  route text null,
  status text not null default 'NY',
  admin_comment text null,
  priority text not null default 'NORMAL',
  duplicate_count int not null default 0
);

alter table public.feedback_reports enable row level security;

create index if not exists feedback_reports_created_idx on public.feedback_reports (created_at desc);
create index if not exists feedback_reports_status_idx on public.feedback_reports (status);
create index if not exists feedback_reports_type_idx on public.feedback_reports (type);
create index if not exists feedback_reports_dupes_idx on public.feedback_reports (duplicate_count desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_reports'
      and policyname = 'feedback_reports_insert_own'
  ) then
    create policy feedback_reports_insert_own
      on public.feedback_reports
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_reports'
      and policyname = 'feedback_reports_select_own'
  ) then
    create policy feedback_reports_select_own
      on public.feedback_reports
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.feedback_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  user_id uuid not null,
  unique (report_id, user_id)
);

alter table public.feedback_votes enable row level security;

create index if not exists feedback_votes_report_idx on public.feedback_votes (report_id);
create index if not exists feedback_votes_user_idx on public.feedback_votes (user_id);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_votes'
      and policyname = 'feedback_votes_insert_own'
  ) then
    create policy feedback_votes_insert_own
      on public.feedback_votes
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_votes'
      and policyname = 'feedback_votes_delete_own'
  ) then
    create policy feedback_votes_delete_own
      on public.feedback_votes
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_votes'
      and policyname = 'feedback_votes_select_own'
  ) then
    create policy feedback_votes_select_own
      on public.feedback_votes
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

