-- Add email access control columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_alias TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_email_access BOOLEAN DEFAULT false;

-- Add index for email alias lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_alias ON profiles(email_alias);
