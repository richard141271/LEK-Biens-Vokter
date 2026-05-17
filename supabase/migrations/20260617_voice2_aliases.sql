create table if not exists public.voice2_aliases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  alias_text text not null,
  alias_norm text not null unique,
  intent jsonb not null,
  usage_count int not null default 1
);

alter table public.voice2_aliases enable row level security;

create index if not exists voice2_aliases_usage_idx on public.voice2_aliases (usage_count desc);
create index if not exists voice2_aliases_updated_idx on public.voice2_aliases (updated_at desc);

