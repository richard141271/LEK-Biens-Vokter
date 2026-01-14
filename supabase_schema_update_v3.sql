-- Add status column to hives table if it doesn't exist
ALTER TABLE hives ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktiv';

-- Verify other columns just in case
-- ALTER TABLE hives ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE hives ADD COLUMN IF NOT EXISTS apiary_id UUID REFERENCES apiaries(id);
-- ALTER TABLE hives ADD COLUMN IF NOT EXISTS hive_number TEXT;
