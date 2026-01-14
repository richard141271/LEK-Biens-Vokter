-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_bank_account TEXT,
ADD COLUMN IF NOT EXISTS private_bank_account TEXT,
ADD COLUMN IF NOT EXISTS wants_to_be_beekeeper BOOLEAN DEFAULT false;
