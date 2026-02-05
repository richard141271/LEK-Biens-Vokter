-- Create table for admin follow-up on founders
CREATE TABLE IF NOT EXISTS founder_followups (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    internal_notes TEXT,
    internal_status TEXT DEFAULT 'active', -- 'active', 'needs_action', 'waiting', 'critical', 'onboarding'
    next_followup_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE founder_followups ENABLE ROW LEVEL SECURITY;

-- Create policies (Admin only)
-- We'll use the existing pattern of checking for specific admin email or role if available
-- But for simplicity and consistency with other admin policies, we'll allow access based on the same logic as other admin tables

CREATE POLICY "Admin full access" ON founder_followups
    FOR ALL
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
        (SELECT email FROM profiles WHERE id = auth.uid()) = 'richard141271@gmail.com'
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_founder_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_founder_followups_updated_at
    BEFORE UPDATE ON founder_followups
    FOR EACH ROW
    EXECUTE FUNCTION update_founder_followups_updated_at();
