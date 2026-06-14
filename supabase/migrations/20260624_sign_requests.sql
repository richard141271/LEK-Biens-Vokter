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
  sender_signature_name text null,
  constraint sign_requests_status_check check (
    status in ('DRAFT', 'SENT', 'SIGNED_BY_RECIPIENT', 'COMPLETED', 'CANCELLED')
  )
);

create index if not exists sign_requests_created_by_idx
  on public.sign_requests (created_by_user_id, created_at desc);

create index if not exists sign_requests_status_idx
  on public.sign_requests (status, created_at desc);

create index if not exists sign_requests_recipient_email_idx
  on public.sign_requests (lower(recipient_email));

create unique index if not exists sign_requests_token_idx
  on public.sign_requests (token);

drop trigger if exists sign_requests_set_updated_at on public.sign_requests;
create trigger sign_requests_set_updated_at
before update on public.sign_requests
for each row execute function public.set_updated_at();

alter table public.sign_requests enable row level security;

create policy "sign_requests_select_own"
on public.sign_requests
for select
to authenticated
using (created_by_user_id = auth.uid());

create policy "sign_requests_insert_own"
on public.sign_requests
for insert
to authenticated
with check (created_by_user_id = auth.uid());

create policy "sign_requests_update_own"
on public.sign_requests
for update
to authenticated
using (created_by_user_id = auth.uid())
with check (created_by_user_id = auth.uid());

create policy "sign_requests_delete_own"
on public.sign_requests
for delete
to authenticated
using (created_by_user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('sign-documents', 'sign-documents', false)
on conflict (id) do nothing;

create policy "sign_documents_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sign-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "sign_documents_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sign-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

create policy "sign_documents_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sign-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
