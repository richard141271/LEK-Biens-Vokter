-- Add contact_organization to rentals table
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contact_organization TEXT;
