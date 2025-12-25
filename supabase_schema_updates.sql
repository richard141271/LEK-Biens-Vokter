-- Kjøres i Supabase SQL Editor

-- 1. Legg til manglende kolonner i 'inspections' tabellen
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS temperature NUMERIC;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status TEXT;

-- 2. Legg til siste_inspeksjon dato i 'hives' tabellen hvis den mangler
ALTER TABLE hives ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- 3. Oppdater eksisterende kuber med riktig dato fra historikken (fikser "Aldri inspisert" feilen)
UPDATE hives
SET last_inspection_date = (
  SELECT MAX(inspection_date)
  FROM inspections
  WHERE inspections.hive_id = hives.id
);
