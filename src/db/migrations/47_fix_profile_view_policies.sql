-- Fix profile view policies to prevent infinite recursion and ensure admins can see all

-- 1. Drop existing policies that might conflict or cause recursion
DROP POLICY IF EXISTS "Inspectors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 2. Create a basic policy for users to view their own profile
-- This is essential for the admin check to work without recursion
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 3. Create a policy for Admins and Mattilsynet to view ALL profiles
-- We use a subquery that relies on the "Users can view own profile" policy
CREATE POLICY "Inspectors can view all profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'mattilsynet')
    )
);
