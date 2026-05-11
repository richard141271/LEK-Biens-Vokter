ALTER TABLE apiary_contacts
  ADD COLUMN IF NOT EXISTS special_terms_updated_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload config';
