-- 1. Add fields to profiles for beekeeper settings
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS service_radius integer DEFAULT 50000, -- Meters (50km default)
ADD COLUMN IF NOT EXISTS push_notification_token text;

-- 2. Add managed_by to apiaries to allow beekeepers to see/manage tenant apiaries
ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS managed_by uuid REFERENCES profiles(id);

-- 3. Create Inspections table for scheduling and RSVP
CREATE TABLE IF NOT EXISTS inspections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    apiary_id uuid REFERENCES apiaries(id) ON DELETE CASCADE,
    rental_id uuid REFERENCES rentals(id) ON DELETE SET NULL,
    beekeeper_id uuid REFERENCES profiles(id),
    planned_date timestamptz NOT NULL,
    status text CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')) DEFAULT 'planned',
    tenant_rsvp_status text CHECK (tenant_rsvp_status IN ('pending', 'attending', 'not_attending')) DEFAULT 'pending',
    attendees_count integer DEFAULT 0,
    suit_sizes jsonb DEFAULT '[]', -- Array of sizes e.g. ["M", "L", "Child"]
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS on inspections
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- 5. Policies for inspections
-- Beekeepers can manage inspections they created
CREATE POLICY "Beekeepers can manage their inspections"
ON inspections
FOR ALL
USING (auth.uid() = beekeeper_id);

-- Tenants can view inspections for their apiaries
CREATE POLICY "Tenants can view inspections for their apiaries"
ON inspections
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM apiaries 
        WHERE apiaries.id = inspections.apiary_id 
        AND apiaries.user_id = auth.uid()
    )
);

-- Tenants can update RSVP for their inspections
CREATE POLICY "Tenants can update RSVP"
ON inspections
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM apiaries 
        WHERE apiaries.id = inspections.apiary_id 
        AND apiaries.user_id = auth.uid()
    )
);

-- 6. Add policy for apiaries to be viewable by managers
CREATE POLICY "Managers can view assigned apiaries"
ON apiaries
FOR SELECT
USING (auth.uid() = managed_by);

CREATE POLICY "Managers can update assigned apiaries"
ON apiaries
FOR UPDATE
USING (auth.uid() = managed_by);
