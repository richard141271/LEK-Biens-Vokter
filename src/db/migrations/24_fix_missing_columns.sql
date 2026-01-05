-- Add description column to apiaries if it doesn't exist
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure contact_organization exists in rentals (from previous context)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contact_organization TEXT;
