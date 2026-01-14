-- Add coordinates to apiaries
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Add coordinates to profiles (for beekeeper home location)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Add coordinates to rentals (for order location)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS longitude FLOAT;
