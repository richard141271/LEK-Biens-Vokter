-- Fix inspections table to match the code requirements

-- 1. Ensure basic columns exist
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS time TEXT; -- Using TEXT to store "HH:MM"
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspection_date DATE DEFAULT CURRENT_DATE;

-- 2. Add specific inspection details
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS queen_seen BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS eggs_seen BOOLEAN DEFAULT FALSE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS brood_condition TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS honey_stores TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS temperament TEXT;

-- 3. Ensure notes column exists (handle potential naming conflict with 'note')
-- If 'note' exists but 'notes' does not, we can rename it or just add 'notes'.
-- For safety, we'll just add 'notes' if it's missing.
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Ensure other fields exist
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS temperature NUMERIC;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS weather TEXT;

-- 5. Fix potential 'date' vs 'inspection_date' confusion
-- If 'date' exists and has data, but 'inspection_date' is null, we could copy it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'date') THEN
        UPDATE inspections SET inspection_date = date WHERE inspection_date IS NULL;
    END IF;
END $$;
