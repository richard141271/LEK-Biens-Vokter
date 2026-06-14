alter table public.sign_requests
add column if not exists receipt_pdf_path text null;

create index if not exists sign_requests_receipt_pdf_idx
  on public.sign_requests (receipt_pdf_path);

