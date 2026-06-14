update public.sign_requests
set
  status = case
    when status = 'CANCELLED' then 'CANCELLED'
    when sender_signed_at is not null then 'COMPLETED'
    when recipient_signed_at is not null then 'SIGNED_BY_RECIPIENT'
    when status = 'DRAFT' then 'DRAFT'
    else 'SENT'
  end,
  updated_at = greatest(updated_at, now())
where
  status is distinct from case
    when status = 'CANCELLED' then 'CANCELLED'
    when sender_signed_at is not null then 'COMPLETED'
    when recipient_signed_at is not null then 'SIGNED_BY_RECIPIENT'
    when status = 'DRAFT' then 'DRAFT'
    else 'SENT'
  end;

