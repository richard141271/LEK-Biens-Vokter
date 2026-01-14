-- Fix missing columns in hive_logs
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Fix missing columns in apiaries just in case
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bigård';
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Ensure profiles table has all necessary columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beekeeping_type TEXT DEFAULT 'hobby';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS private_bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_lek_honning_member BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_norges_birokterlag_member BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_association TEXT;
