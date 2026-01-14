-- Function to check if user is admin or mattilsynet
CREATE OR REPLACE FUNCTION is_admin_or_inspector()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'mattilsynet')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make hive_id nullable to allow general reports
ALTER TABLE hive_logs ALTER COLUMN hive_id DROP NOT NULL;

-- Add user_id to track reporter directly
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- Backfill user_id from hives for existing logs
UPDATE hive_logs
SET user_id = hives.user_id
FROM hives
WHERE hive_logs.hive_id = hives.id
AND hive_logs.user_id IS NULL;

-- Enable RLS (if not already)
ALTER TABLE hive_logs ENABLE ROW LEVEL SECURITY;

-- Policy for inserting own logs (when hive_id is null or just generally)
CREATE POLICY "Users can insert own logs" ON hive_logs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy for viewing own logs
CREATE POLICY "Users can view own logs" ON hive_logs
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Mattilsynet/Admin can view all logs (assuming is_admin_or_inspector function exists from previous migration)
CREATE POLICY "Admin and Mattilsynet can view all logs" ON hive_logs
FOR SELECT
USING (
  is_admin_or_inspector()
);

-- Allow updating (resolving) for Admin/Mattilsynet
CREATE POLICY "Admin and Mattilsynet can update logs" ON hive_logs
FOR UPDATE
USING (
  is_admin_or_inspector()
);
