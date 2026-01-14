-- Enable RLS on rentals if not already enabled (it is, but good practice)
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Policy for Beekeepers and Admins to view rentals
-- This allows:
-- 1. Any user to see rentals assigned to them (covered by existing policy, but let's be safe)
-- 2. Beekeepers to see rentals assigned to them
-- 3. Beekeepers/Admins to see ALL rentals (so they can manage/assign them)
CREATE POLICY "Beekeepers and Admins can view all rentals"
  ON rentals FOR SELECT
  USING (
    auth.uid() = assigned_beekeeper_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'beekeeper' OR profiles.role = 'admin')
    )
  );

-- Allow Beekeepers/Admins to update rentals (e.g. to accept them, assign apiary_id)
CREATE POLICY "Beekeepers and Admins can update rentals"
  ON rentals FOR UPDATE
  USING (
    auth.uid() = assigned_beekeeper_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'beekeeper' OR profiles.role = 'admin')
    )
  );
