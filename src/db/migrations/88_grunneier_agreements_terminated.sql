DO $$ BEGIN
  ALTER TYPE grunneier_agreement_status ADD VALUE IF NOT EXISTS 'terminated';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE grunneier_agreements
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;

ALTER TABLE grunneier_agreements
  ADD COLUMN IF NOT EXISTS terminated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload config';

