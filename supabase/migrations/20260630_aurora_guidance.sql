alter table public.aurora_suggestions
  add column if not exists guidance jsonb not null default '[]'::jsonb;

