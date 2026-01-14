-- Ensure all rental linking columns exist
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS apiary_id UUID REFERENCES apiaries(id);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS assigned_beekeeper_id UUID REFERENCES profiles(id);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS distance_to_beekeeper FLOAT;

-- Refresh PostgREST schema cache to ensure the new columns are visible
NOTIFY pgrst, 'reload config';
