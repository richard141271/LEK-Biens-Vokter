alter table public.profiles
  add column if not exists plan text not null default 'PRO';

update public.profiles
set plan = 'PRO'
where plan is null
   or upper(plan) not in ('FREE', 'PLUS', 'PREMIUM', 'PRO');

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('FREE', 'PLUS', 'PREMIUM', 'PRO'));

alter table public.profiles
  add column if not exists is_pilot_user boolean not null default true;

update public.profiles
set is_pilot_user = true
where is_pilot_user is null;

alter table public.profiles
  add column if not exists feature_overrides jsonb not null default '{}'::jsonb;
