CREATE TABLE IF NOT EXISTS survey_pilot_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  interested boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE survey_pilot_interest ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all
CREATE POLICY "Admins can view pilot interest"
ON survey_pilot_interest FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow service role to do anything (implicit, but good to know)
