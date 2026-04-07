create sequence if not exists public.shareholder_no_seq;

alter table public.shareholders
add column if not exists shareholder_no bigint;

alter table public.shareholders
alter column shareholder_no set default nextval('public.shareholder_no_seq');

select setval(
  'public.shareholder_no_seq',
  coalesce((select max(shareholder_no) from public.shareholders), 0) + 1,
  false
);

update public.shareholders
set shareholder_no = nextval('public.shareholder_no_seq')
where shareholder_no is null;

alter table public.shareholders
alter column shareholder_no set not null;

create unique index if not exists shareholders_shareholder_no_unique on public.shareholders(shareholder_no);
