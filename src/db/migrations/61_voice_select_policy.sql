-- Allow authenticated users to read approved aliases
DROP POLICY IF EXISTS "Users can read approved aliases" ON voice_aliases;
CREATE POLICY "Users can read approved aliases"
  ON voice_aliases FOR SELECT
  TO authenticated
  USING (status = 'approved');
