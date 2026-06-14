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
set completed_email_delivery_status = 'NOT_SENT'
where completed_email_delivery_status is null;

create index if not exists sign_requests_completed_email_status_idx
  on public.sign_requests (completed_email_delivery_status);
