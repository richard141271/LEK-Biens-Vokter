create extension if not exists pgcrypto;

create table if not exists public.sign_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text null,
  pdf_path text not null,
  completed_pdf_path text null,
  recipient_name text not null,
  recipient_email text not null,
  recipient_phone text null,
  token text not null unique,
  status text not null default 'DRAFT',
  recipient_signed_at timestamptz null,
  sender_signed_at timestamptz null,
  recipient_signature_name text null,
  sender_signature_name text null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sign_requests_status_check'
      and conrelid = 'public.sign_requests'::regclass
  ) then
    alter table public.sign_requests
      add constraint sign_requests_status_check
      check (status in ('DRAFT', 'SENT', 'SIGNED_BY_RECIPIENT', 'COMPLETED', 'CANCELLED'));
  end if;
end
$$;

alter table public.sign_requests
  add column if not exists receipt_pdf_path text null;

alter table public.sign_requests
  add column if not exists completed_email_delivery_status text not null default 'NOT_SENT';

alter table public.sign_requests
  add column if not exists completed_email_delivery_source text null;

alter table public.sign_requests
  add column if not exists completed_email_last_attempt_at timestamptz null;

alter table public.sign_requests
  add column if not exists completed_email_sent_at timestamptz null;

alter table public.sign_requests
  add column if not exists completed_email_error text null;

update public.sign_requests
set
  status = case
    when status = 'CANCELLED' then 'CANCELLED'
    when sender_signed_at is not null then 'COMPLETED'
    when recipient_signed_at is not null then 'SIGNED_BY_RECIPIENT'
    when status = 'DRAFT' then 'DRAFT'
    else 'SENT'
  end,
  completed_email_delivery_status = coalesce(completed_email_delivery_status, 'NOT_SENT'),
  updated_at = greatest(updated_at, now())
where
  status is distinct from case
    when status = 'CANCELLED' then 'CANCELLED'
    when sender_signed_at is not null then 'COMPLETED'
    when recipient_signed_at is not null then 'SIGNED_BY_RECIPIENT'
    when status = 'DRAFT' then 'DRAFT'
    else 'SENT'
  end
  or completed_email_delivery_status is null;

create index if not exists sign_requests_created_by_idx
  on public.sign_requests (created_by_user_id, created_at desc);

create index if not exists sign_requests_status_idx
  on public.sign_requests (status, created_at desc);

create index if not exists sign_requests_recipient_email_idx
  on public.sign_requests (lower(recipient_email));

create unique index if not exists sign_requests_token_idx
  on public.sign_requests (token);

create index if not exists sign_requests_receipt_pdf_idx
  on public.sign_requests (receipt_pdf_path);

create index if not exists sign_requests_completed_email_status_idx
  on public.sign_requests (completed_email_delivery_status);

drop trigger if exists sign_requests_set_updated_at on public.sign_requests;
create trigger sign_requests_set_updated_at
before update on public.sign_requests
for each row execute function public.set_updated_at();

alter table public.sign_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sign_requests'
      and policyname = 'sign_requests_select_own'
  ) then
    create policy "sign_requests_select_own"
    on public.sign_requests
    for select
    to authenticated
    using (created_by_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sign_requests'
      and policyname = 'sign_requests_insert_own'
  ) then
    create policy "sign_requests_insert_own"
    on public.sign_requests
    for insert
    to authenticated
    with check (created_by_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sign_requests'
      and policyname = 'sign_requests_update_own'
  ) then
    create policy "sign_requests_update_own"
    on public.sign_requests
    for update
    to authenticated
    using (created_by_user_id = auth.uid())
    with check (created_by_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sign_requests'
      and policyname = 'sign_requests_delete_own'
  ) then
    create policy "sign_requests_delete_own"
    on public.sign_requests
    for delete
    to authenticated
    using (created_by_user_id = auth.uid());
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('sign-documents', 'sign-documents', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sign_documents_insert_own'
  ) then
    create policy "sign_documents_insert_own"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'sign-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sign_documents_select_own'
  ) then
    create policy "sign_documents_select_own"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'sign-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sign_documents_update_own'
  ) then
    create policy "sign_documents_update_own"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'sign-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'sign-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sign_documents_delete_own'
  ) then
    create policy "sign_documents_delete_own"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'sign-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end
$$;
