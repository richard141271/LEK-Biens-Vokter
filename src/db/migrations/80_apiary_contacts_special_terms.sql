ALTER TABLE apiary_contacts
  ADD COLUMN IF NOT EXISTS special_terms TEXT;

NOTIFY pgrst, 'reload config';
