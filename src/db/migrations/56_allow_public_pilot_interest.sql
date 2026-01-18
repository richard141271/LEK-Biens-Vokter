-- Allow public (anon) and authenticated users to insert into pilot_interest
-- This is necessary because the survey is public and we want to capture interest without requiring admin privileges
CREATE POLICY "Allow public insert pilot_interest"
ON pilot_interest
FOR INSERT
WITH CHECK (true);

-- Add status and source columns to capture more details (Ja vs Kanskje)
ALTER TABLE pilot_interest ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE pilot_interest ADD COLUMN IF NOT EXISTS source text;
