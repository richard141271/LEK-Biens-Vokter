-- Fix missing columns in hive_logs
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Fix missing columns in profiles to match registration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beekeeping_type TEXT DEFAULT 'hobby';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS private_bank_account TEXT;
