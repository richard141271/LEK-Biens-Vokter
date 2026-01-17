CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  date timestamp with time zone,
  duration integer,
  audio_url text,
  transcript text,
  summary text,
  action_points text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting notes"
ON meeting_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting notes"
ON meeting_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting notes"
ON meeting_notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting notes"
ON meeting_notes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all meeting notes"
ON meeting_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all meeting notes"
ON meeting_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete all meeting notes"
ON meeting_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audio', 'meeting-audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated meeting audio uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND owner = auth.uid()
);

CREATE POLICY "Allow owner and admins to view meeting audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

