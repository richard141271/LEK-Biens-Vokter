alter table public.apiary_contacts
add column if not exists special_terms_contact_signature_name text;

alter table public.apiary_contacts
add column if not exists special_terms_contact_signed_at timestamptz;

alter table public.apiary_contacts
add column if not exists special_terms_beekeeper_signature_name text;

alter table public.apiary_contacts
add column if not exists special_terms_beekeeper_signed_at timestamptz;

create index if not exists apiary_contacts_special_terms_signed_at_idx
on public.apiary_contacts (apiary_id, contact_id, special_terms_contact_signed_at, special_terms_beekeeper_signed_at);
