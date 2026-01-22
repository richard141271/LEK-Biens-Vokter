-- Create generic survey submissions table
CREATE TABLE IF NOT EXISTS survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id text NOT NULL,
  survey_version text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Enable RLS
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public access to insert (for anonymous surveys)
CREATE POLICY "Public insert survey_submissions"
ON survey_submissions
FOR INSERT
WITH CHECK (true);

-- Allow admins to view all submissions
CREATE POLICY "Admins can view survey_submissions"
ON survey_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create index on survey_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_survey_submissions_survey_id ON survey_submissions(survey_id);
