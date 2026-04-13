-- Grunneierportal: kontakter knyttet til bigårder + magic link tokens

DO $$ BEGIN
  CREATE TYPE apiary_contact_role AS ENUM ('grunneier', 'kontaktperson', 'samarbeidspartner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  phone TEXT,
  email TEXT
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts (created_by);

CREATE TABLE IF NOT EXISTS apiary_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apiary_id UUID NOT NULL REFERENCES apiaries(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role apiary_contact_role NOT NULL DEFAULT 'grunneier'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apiary_contacts_unique ON apiary_contacts (apiary_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_apiary_contacts_apiary_id ON apiary_contacts (apiary_id);
CREATE INDEX IF NOT EXISTS idx_apiary_contacts_contact_id ON apiary_contacts (contact_id);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_tokens_token ON magic_tokens (token);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens (lower(email));
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens (expires_at);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apiary_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contacts selectable by apiary owners" ON contacts;
CREATE POLICY "Contacts selectable by apiary owners"
  ON contacts
  FOR SELECT
  TO authenticated
  USING (
    contacts.created_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM apiary_contacts ac
        JOIN apiaries a ON a.id = ac.apiary_id
        WHERE ac.contact_id = contacts.id
          AND a.user_id = auth.uid()
      )
  );

DROP POLICY IF EXISTS "Contacts insertable by authenticated" ON contacts;
CREATE POLICY "Contacts insertable by authenticated"
  ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (contacts.created_by = auth.uid());

DROP POLICY IF EXISTS "Contacts updatable by apiary owners" ON contacts;
CREATE POLICY "Contacts updatable by apiary owners"
  ON contacts
  FOR UPDATE
  TO authenticated
  USING (
    contacts.created_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM apiary_contacts ac
        JOIN apiaries a ON a.id = ac.apiary_id
        WHERE ac.contact_id = contacts.id
          AND a.user_id = auth.uid()
      )
  )
  WITH CHECK (
    contacts.created_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM apiary_contacts ac
        JOIN apiaries a ON a.id = ac.apiary_id
        WHERE ac.contact_id = contacts.id
          AND a.user_id = auth.uid()
      )
  );

DROP POLICY IF EXISTS "Contacts deletable by apiary owners" ON contacts;
CREATE POLICY "Contacts deletable by apiary owners"
  ON contacts
  FOR DELETE
  TO authenticated
  USING (
    contacts.created_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM apiary_contacts ac
        JOIN apiaries a ON a.id = ac.apiary_id
        WHERE ac.contact_id = contacts.id
          AND a.user_id = auth.uid()
      )
  );

DROP POLICY IF EXISTS "Apiary contacts manageable by owner" ON apiary_contacts;
CREATE POLICY "Apiary contacts manageable by owner"
  ON apiary_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM apiaries a
      WHERE a.id = apiary_contacts.apiary_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM apiaries a
      WHERE a.id = apiary_contacts.apiary_id
        AND a.user_id = auth.uid()
    )
  );

-- magic_tokens er kun ment for server/service-role. Ingen RLS policies.
