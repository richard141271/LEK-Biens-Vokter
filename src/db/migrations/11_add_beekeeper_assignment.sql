-- Add assigned beekeeper to rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS assigned_beekeeper_id UUID REFERENCES profiles(id);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS distance_to_beekeeper FLOAT;
