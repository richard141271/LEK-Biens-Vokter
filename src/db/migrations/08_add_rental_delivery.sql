-- Add delivery tracking fields to rentals table
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS beekeeper_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS delivery_status text CHECK (delivery_status IN ('pending', 'assigned', 'delivered', 'installed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_checklist jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Add policy for beekeepers to view rentals they are assigned to or that are unassigned (pending)
-- For simplicity, we'll allow all authenticated users to view rentals for now to simulate the "beekeeper app" view,
-- but in production this should be restricted to users with a 'beekeeper' role.
CREATE POLICY "Beekeepers can view all active rentals"
  ON rentals FOR SELECT
  USING (auth.role() = 'authenticated'); 

-- Allow beekeepers to update rentals (assign themselves, complete delivery)
CREATE POLICY "Beekeepers can update rentals"
  ON rentals FOR UPDATE
  USING (auth.role() = 'authenticated');
