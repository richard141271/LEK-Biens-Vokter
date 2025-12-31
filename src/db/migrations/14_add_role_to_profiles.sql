-- Add role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'beekeeper';

-- Update existing users to have 'beekeeper' role if null
UPDATE profiles SET role = 'beekeeper' WHERE role IS NULL;
