-- 1. Sikre at admin_status kolonnen finnes (for "Lukk hendelse" knappen)
ALTER TABLE hive_logs ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'pending';

-- 2. Gi Mattilsynet og Admins tilgang til å se ALLE bigårder (for Kartet og Registeret)
DROP POLICY IF EXISTS "Admin View All Apiaries" ON apiaries;
CREATE POLICY "Admin View All Apiaries" ON apiaries
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'mattilsynet')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'richard141271@gmail.com'
);

-- 3. Gi tilgang til å se ALLE bikuber
DROP POLICY IF EXISTS "Admin View All Hives" ON hives;
CREATE POLICY "Admin View All Hives" ON hives
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'mattilsynet')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'richard141271@gmail.com'
);

-- 4. Gi tilgang til å se ALLE logger/varsler
DROP POLICY IF EXISTS "Admin View All Logs" ON hive_logs;
CREATE POLICY "Admin View All Logs" ON hive_logs
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'mattilsynet')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'richard141271@gmail.com'
);

-- 5. Gi tilgang til å se brukerprofiler (for å se hvem som rapporterte)
DROP POLICY IF EXISTS "Admin View All Profiles" ON profiles;
CREATE POLICY "Admin View All Profiles" ON profiles
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'mattilsynet')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'richard141271@gmail.com'
);
