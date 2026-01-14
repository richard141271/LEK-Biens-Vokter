-- 1. Add shared_with_mattilsynet column to hive_logs
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS shared_with_mattilsynet BOOLEAN DEFAULT false;

-- 2. Update RLS for hive_logs
-- Drop existing policy to recreate it with new logic
DROP POLICY IF EXISTS "Inspectors can view all logs" ON hive_logs;
DROP POLICY IF EXISTS "Admin and Mattilsynet can view all logs" ON hive_logs;

-- Create new policy: Mattilsynet can see SYKDOM logs OR logs explicitly shared
CREATE POLICY "Mattilsynet view policy" ON hive_logs
FOR SELECT
USING (
  (auth.uid() = user_id) -- Own logs
  OR
  (is_admin_or_inspector() AND action = 'SYKDOM') -- All sickness reports
  OR
  (is_admin_or_inspector() AND shared_with_mattilsynet = true) -- Shared inspections
);

-- 3. Create RPC function for secure statistics (bypassing RLS for counts)
CREATE OR REPLACE FUNCTION get_mattilsynet_stats()
RETURNS TABLE (
  total_beekeepers BIGINT,
  total_apiaries BIGINT,
  total_hives BIGINT,
  active_sickness BIGINT,
  resolved_sickness BIGINT,
  total_inspections BIGINT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT count(*) FROM profiles WHERE role = 'beekeeper') as total_beekeepers,
    (SELECT count(*) FROM apiaries) as total_apiaries,
    (SELECT count(*) FROM hives) as total_hives,
    (SELECT count(*) FROM hive_logs WHERE action = 'SYKDOM' AND admin_status = 'pending') as active_sickness,
    (SELECT count(*) FROM hive_logs WHERE action = 'SYKDOM' AND admin_status = 'resolved') as resolved_sickness,
    (SELECT count(*) FROM hive_logs WHERE action = 'INSPEKSJON') as total_inspections;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix Registry Visibility (Re-affirm RLS for Apiaries and Hives)
-- Ensure Mattilsynet can see ALL apiaries and hives, not just their own
DROP POLICY IF EXISTS "Inspectors can view all apiaries" ON apiaries;
CREATE POLICY "Inspectors can view all apiaries" ON apiaries
FOR SELECT
USING (
  is_admin_or_inspector() OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Inspectors can view all hives" ON hives;
CREATE POLICY "Inspectors can view all hives" ON hives
FOR SELECT
USING (
  is_admin_or_inspector() OR auth.uid() = user_id
);

-- Fix Profiles Visibility
DROP POLICY IF EXISTS "Inspectors can view all profiles" ON profiles;
CREATE POLICY "Inspectors can view all profiles" ON profiles
FOR SELECT
USING (
  is_admin_or_inspector() OR auth.uid() = id
);

-- 5. RPC for Admin Deletion (Deletes Profile, assumes Cascade or Trigger handles Auth, or just cleans up Data)
-- Note: Deleting from auth.users requires Service Role, which we can't easily do from SQL function without extension.
-- However, we can delete the profile.
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Check if requester is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Delete profile (should cascade to hives, logs etc if FKs are set to CASCADE)
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;
