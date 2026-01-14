-- Add 'mattilsynet' and 'admin' policies for full access

-- 1. Apiaries: Allow mattilsynet and admin to view ALL apiaries
CREATE POLICY "Inspectors can view all apiaries"
ON apiaries FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('mattilsynet', 'admin')
    )
);

-- 2. Hives: Allow mattilsynet and admin to view ALL hives
CREATE POLICY "Inspectors can view all hives"
ON hives FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('mattilsynet', 'admin')
    )
);

-- 3. Inspections: Allow mattilsynet and admin to view ALL inspections
CREATE POLICY "Inspectors can view all inspections"
ON inspections FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('mattilsynet', 'admin')
    )
);

-- 4. Hive Logs: Allow mattilsynet and admin to view ALL logs
CREATE POLICY "Inspectors can view all logs"
ON hive_logs FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('mattilsynet', 'admin')
    )
);

-- 5. Profiles: Allow mattilsynet and admin to view basic profile info (for contact)
CREATE POLICY "Inspectors can view all profiles"
ON profiles FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('mattilsynet', 'admin')
    )
);
