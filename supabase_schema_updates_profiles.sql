-- Kjøres i Supabase SQL Editor

-- Sikre at 'profiles' tabellen har alle nødvendige felter for registrering og innstillinger
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_norges_birokterlag_member BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_association TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_lek_honning_member BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beekeeping_type TEXT DEFAULT 'hobby';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS private_bank_account TEXT;
