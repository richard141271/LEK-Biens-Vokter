CREATE TABLE IF NOT EXISTS pilot_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  interested boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(email)
);

INSERT INTO pilot_interest (email, interested, created_at)
SELECT spi.email, spi.interested, spi.created_at
FROM survey_pilot_interest spi
ON CONFLICT (email) DO NOTHING;

ALTER TABLE pilot_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pilot interest (pilot_interest)"
ON pilot_interest FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

