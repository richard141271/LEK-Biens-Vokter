alter table public.inspections
add column if not exists performed_actions jsonb;
