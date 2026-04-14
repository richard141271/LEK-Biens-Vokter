CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT NOT NULL,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  public_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_public_slug ON companies(public_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_number ON companies(org_number);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

ALTER TABLE apiaries
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE apiaries
  ADD COLUMN IF NOT EXISTS package_type TEXT;

ALTER TABLE apiaries
  ADD COLUMN IF NOT EXISTS status TEXT;

CREATE INDEX IF NOT EXISTS idx_apiaries_company_id ON apiaries(company_id);

ALTER TABLE magic_tokens
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_magic_tokens_user_id ON magic_tokens(user_id);

NOTIFY pgrst, 'reload config';
