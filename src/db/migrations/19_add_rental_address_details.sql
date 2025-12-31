
-- Add address details to rentals table
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS contact_postal_code text,
ADD COLUMN IF NOT EXISTS contact_city text;
