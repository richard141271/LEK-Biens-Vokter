-- Sikrer at eiere kan se og opprette sine egne inspeksjoner.
-- Disse policyene fantes på gammel staging, men manglet i migrasjonssettet,
-- noe som gjorde at vanlige birøktere ikke så egne inspeksjoner på ny staging.

DROP POLICY IF EXISTS "Users can view own inspections" ON inspections;
CREATE POLICY "Users can view own inspections"
ON inspections FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inspections" ON inspections;
CREATE POLICY "Users can insert own inspections"
ON inspections FOR INSERT
WITH CHECK (auth.uid() = user_id);
