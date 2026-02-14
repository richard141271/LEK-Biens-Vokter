-- Voice Diagnostics: persistent shared storage

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Failures table
CREATE TABLE IF NOT EXISTS voice_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('inspection', 'training')) DEFAULT 'inspection',
  recognized_text TEXT NOT NULL,
  matched_phrase TEXT,
  similarity NUMERIC,
  expected_parse JSONB,
  parsed_before JSONB,
  parsed_after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_failures ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own rows
DROP POLICY IF EXISTS "Users can insert own voice failures" ON voice_failures;
CREATE POLICY "Users can insert own voice failures"
  ON voice_failures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can read all
DROP POLICY IF EXISTS "Admins can view voice failures" ON voice_failures;
CREATE POLICY "Admins can view voice failures"
  ON voice_failures FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_voice_failures_created_at ON voice_failures(created_at DESC);

-- Optional: Aliases table for approved corrections (future)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_alias_status') THEN
    CREATE TYPE voice_alias_status AS ENUM ('pending','approved','rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS voice_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,        -- expected phrase
  alias TEXT NOT NULL,         -- misrecognized variant
  status voice_alias_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_aliases ENABLE ROW LEVEL SECURITY;

-- Only admins can manage aliases for now
DROP POLICY IF EXISTS "Admins can manage aliases" ON voice_aliases;
CREATE POLICY "Admins can manage aliases"
  ON voice_aliases
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
