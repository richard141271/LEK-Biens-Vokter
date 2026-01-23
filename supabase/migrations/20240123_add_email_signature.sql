-- Add email_signature column to profiles table
-- Run this in your Supabase SQL Editor to fix the schema error

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_signature text;

-- Optional: Add comment
COMMENT ON COLUMN profiles.email_signature IS 'HTML signature for email';
