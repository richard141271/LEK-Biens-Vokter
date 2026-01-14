-- Kjøres i Supabase SQL Editor

-- 1. Oppdateringer for 'inspections' tabellen (fikser lagring av inspeksjon)
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS temperature NUMERIC;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status TEXT;

-- 2. Oppdateringer for 'hives' tabellen (fikser kubetype og aktiv/inaktiv)
ALTER TABLE hives ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PRODUKSJON';
ALTER TABLE hives ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE hives ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- 3. Oppdateringer for 'apiaries' tabellen (fikser bilnummer)
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- 4. Oppdater eksisterende kuber med riktig dato fra historikken
UPDATE hives
SET last_inspection_date = (
  SELECT MAX(inspection_date)
  FROM inspections
  WHERE inspections.hive_id = hives.id
);
