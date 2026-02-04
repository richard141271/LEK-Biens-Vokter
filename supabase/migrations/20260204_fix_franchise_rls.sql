
-- Fix Franchise RLS Policies to ensure owners can see their units

-- 1. Enable RLS on franchise_units if not enabled
ALTER TABLE franchise_units ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can do everything on franchise_units" ON franchise_units;
DROP POLICY IF EXISTS "Franchisees can view their own unit" ON franchise_units;

-- 3. Create new policies
-- Admin Policy: Full access
CREATE POLICY "Admins can do everything on franchise_units"
ON franchise_units
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR auth.email() = 'richard141271@gmail.com'
);

-- Franchisee Policy: View own unit
CREATE POLICY "Franchisees can view their own unit"
ON franchise_units
FOR SELECT
USING (
    owner_id = auth.uid()
);

-- Note: We don't need update/delete for franchisees yet, as admins manage the units.
