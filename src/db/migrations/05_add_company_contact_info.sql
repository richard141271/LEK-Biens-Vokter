-- Add company contact info to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_phone TEXT;
