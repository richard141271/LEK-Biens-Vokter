
-- Grant admin role to the main user (VIP) using auth.users lookup
-- This avoids the "column email does not exist" error in profiles table
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'richard141271@gmail.com'
);

-- Update RLS policies to explicitly allow the VIP email as a fallback
-- This ensures that even if the role update fails or profiles RLS is tricky, the specific user can access.

-- Franchise Units Policy Update
DROP POLICY IF EXISTS "Admins can manage franchise units" ON franchise_units;
CREATE POLICY "Admins can manage franchise units" ON franchise_units
    FOR ALL USING (
        (auth.jwt() ->> 'email' = 'richard141271@gmail.com') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can view all franchise units" ON franchise_units;
CREATE POLICY "Admins can view all franchise units" ON franchise_units
    FOR SELECT USING (
        (auth.jwt() ->> 'email' = 'richard141271@gmail.com') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Franchise Documents Policy Update
DROP POLICY IF EXISTS "Admins can manage documents" ON franchise_documents;
CREATE POLICY "Admins can manage documents" ON franchise_documents
    FOR ALL USING (
        (auth.jwt() ->> 'email' = 'richard141271@gmail.com') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Ensure profiles RLS allows users to see their own role
-- This prevents infinite recursion if the admin check tries to query profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        id = auth.uid()
    );

-- Also allow admins to view all profiles (needed for user selection in modal)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'email' = 'richard141271@gmail.com') OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
