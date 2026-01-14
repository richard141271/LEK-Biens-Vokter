
-- Add region/county to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS city text;
