
-- Add estimated_delivery_date to rentals
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS estimated_delivery_date timestamptz;
