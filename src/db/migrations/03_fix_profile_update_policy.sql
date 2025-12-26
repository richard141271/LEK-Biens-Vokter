-- Enable RLS on profiles if not already enabled (it should be)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts/stale definitions
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create the policy allowing users to update their own rows
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant update privileges to authenticated users (if not already granted)
GRANT UPDATE ON profiles TO authenticated;
