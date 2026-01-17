-- Fix storage policy to allow users to view their own folder based on path
-- This is more robust than relying on the 'owner' column which can be tricky to update

-- Drop the old policy if it exists (optional, or we can just add a new one)
DROP POLICY IF EXISTS "Allow owner and admins to view meeting audio" ON storage.objects;

-- Create a new comprehensive policy
CREATE POLICY "Allow users to view their own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (
    -- Allow if path starts with user ID
    name LIKE (auth.uid()::text || '/%')
    OR
    -- Allow admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);
