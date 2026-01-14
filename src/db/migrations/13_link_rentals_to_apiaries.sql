-- Add apiary_id to rentals to link the rental contract to the physical apiary
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS apiary_id UUID REFERENCES apiaries(id);
