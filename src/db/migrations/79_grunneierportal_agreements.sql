DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'contacts_created_by_fkey'
  ) THEN
    ALTER TABLE contacts DROP CONSTRAINT contacts_created_by_fkey;
  END IF;
END $$;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  CREATE TYPE grunneier_agreement_status AS ENUM (
    'draft',
    'awaiting_contact',
    'contact_proposed',
    'awaiting_contact_signature',
    'awaiting_beekeeper_signature',
    'active',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS grunneier_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  apiary_id UUID REFERENCES apiaries(id) ON DELETE SET NULL,
  role apiary_contact_role NOT NULL DEFAULT 'grunneier',
  status grunneier_agreement_status NOT NULL DEFAULT 'draft',
  base_text TEXT NOT NULL,
  contact_proposal TEXT,
  beekeeper_decision TEXT NOT NULL DEFAULT 'pending' CHECK (beekeeper_decision IN ('pending', 'accepted', 'rejected')),
  final_text TEXT,
  contact_signature_name TEXT,
  contact_signed_at TIMESTAMPTZ,
  beekeeper_signature_name TEXT,
  beekeeper_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grunneier_agreements_created_by ON grunneier_agreements(created_by);
CREATE INDEX IF NOT EXISTS idx_grunneier_agreements_contact_id ON grunneier_agreements(contact_id);
CREATE INDEX IF NOT EXISTS idx_grunneier_agreements_apiary_id ON grunneier_agreements(apiary_id);
CREATE INDEX IF NOT EXISTS idx_grunneier_agreements_status ON grunneier_agreements(status);

ALTER TABLE grunneier_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grunneier agreements selectable by owner" ON grunneier_agreements;
CREATE POLICY "Grunneier agreements selectable by owner"
  ON grunneier_agreements
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Grunneier agreements insertable by owner" ON grunneier_agreements;
CREATE POLICY "Grunneier agreements insertable by owner"
  ON grunneier_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Grunneier agreements updatable by owner" ON grunneier_agreements;
CREATE POLICY "Grunneier agreements updatable by owner"
  ON grunneier_agreements
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Grunneier agreements deletable by owner" ON grunneier_agreements;
CREATE POLICY "Grunneier agreements deletable by owner"
  ON grunneier_agreements
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

ALTER TABLE magic_tokens
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'portal';

ALTER TABLE magic_tokens
  ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES grunneier_agreements(id) ON DELETE CASCADE;

ALTER TABLE magic_tokens
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE magic_tokens
  ADD COLUMN IF NOT EXISTS apiary_id UUID REFERENCES apiaries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_magic_tokens_purpose ON magic_tokens(purpose);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_agreement_id ON magic_tokens(agreement_id);

NOTIFY pgrst, 'reload config';
