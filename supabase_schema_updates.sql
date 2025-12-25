-- Add type and active columns to hives table
ALTER TABLE hives ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PRODUKSJON';
ALTER TABLE hives ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Ensure inspections has a status column
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS status TEXT;
