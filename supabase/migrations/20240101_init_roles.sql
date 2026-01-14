-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create enum for roles if preferred, but text is fine for MVP
-- Roles: 'admin', 'beekeeper', 'supplier', 'owner', 'user'

-- Update specific user to admin (Replace with actual ID or run manually)
-- UPDATE profiles SET role = 'admin' WHERE email = 'mattilsynet@lek.no';

-- Add policy for admin access (Example RLS)
-- CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Add policy for hive_logs
-- CREATE POLICY "Admins can view all logs" ON hive_logs FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
