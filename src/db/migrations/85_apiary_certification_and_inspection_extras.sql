-- Extend inspections with extra fields
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS queen_color TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS queen_year INTEGER;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS weather_place TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS actions TEXT[];

-- Apiary self-certification (bigård-nivå)
CREATE TABLE IF NOT EXISTS apiary_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apiary_id UUID NOT NULL REFERENCES apiaries(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certified_from DATE NOT NULL,
  certified_to DATE NOT NULL,
  checklist JSONB NOT NULL,
  hive_photos JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE apiary_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own apiary certifications" ON apiary_certifications;
CREATE POLICY "Owners can view own apiary certifications"
  ON apiary_certifications
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Account members can view apiary certifications" ON apiary_certifications;
CREATE POLICY "Account members can view apiary certifications"
  ON apiary_certifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiary_certifications.owner_id
        AND aa.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert apiary certifications" ON apiary_certifications;
CREATE POLICY "Owners can insert apiary certifications"
  ON apiary_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Account members can insert apiary certifications" ON apiary_certifications;
CREATE POLICY "Account members can insert apiary certifications"
  ON apiary_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiary_certifications.owner_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Owners can update apiary certifications" ON apiary_certifications;
CREATE POLICY "Owners can update apiary certifications"
  ON apiary_certifications
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete apiary certifications" ON apiary_certifications;
CREATE POLICY "Owners can delete apiary certifications"
  ON apiary_certifications
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

NOTIFY pgrst, 'reload schema';
