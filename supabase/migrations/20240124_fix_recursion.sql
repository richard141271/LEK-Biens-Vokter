
-- Fix infinite recursion by using a Security Definer function
-- This function runs with the privileges of the creator (postgres/superuser), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
  user_email text;
BEGIN
  -- Check for VIP email via JWT claims (fastest, no DB lookup needed if in JWT, but here we check auth.users or just trust the JWT)
  user_email := auth.jwt() ->> 'email';
  IF user_email = 'richard141271@gmail.com' THEN
    RETURN true;
  END IF;

  -- Check DB role
  SELECT role INTO current_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Profiles Policies to use the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        is_admin() OR id = auth.uid()
    );

-- Update Franchise Units Policies
DROP POLICY IF EXISTS "Admins can manage franchise units" ON franchise_units;
CREATE POLICY "Admins can manage franchise units" ON franchise_units
    FOR ALL USING (
        is_admin()
    );

DROP POLICY IF EXISTS "Admins can view all franchise units" ON franchise_units;
CREATE POLICY "Admins can view all franchise units" ON franchise_units
    FOR SELECT USING (
        is_admin() OR
        owner_id = auth.uid()
    );

-- Update Documents Policies
DROP POLICY IF EXISTS "Admins can manage documents" ON franchise_documents;
CREATE POLICY "Admins can manage documents" ON franchise_documents
    FOR ALL USING (
        is_admin()
    );
