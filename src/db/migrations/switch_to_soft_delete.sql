-- KJØR DENNE I SUPABASE SQL EDITOR FOR Å AKTIVERE SOFT-DELETE

-- 1. Legg til is_active kolonne i profiles hvis den ikke finnes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Sørg for at alle eksisterende brukere er aktive
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- 3. (Valgfritt) Legg til indeks for raskere filtrering
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
