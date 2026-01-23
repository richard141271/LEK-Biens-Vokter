-- Add email fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_alias TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE;

-- Create MailMessages table
CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_alias TEXT NOT NULL,
  from_alias TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  folder TEXT DEFAULT 'inbox',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add RLS policies (simulated security for now, assuming public for authenticated users to simplify prototype)
ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages sent to their alias
CREATE POLICY "Users can read their own messages" ON mail_messages
  FOR SELECT
  USING (to_alias IN (SELECT email_alias FROM profiles WHERE id = auth.uid()));

-- Allow users to insert messages (sending)
CREATE POLICY "Users can send messages" ON mail_messages
  FOR INSERT
  WITH CHECK (from_alias IN (SELECT email_alias FROM profiles WHERE id = auth.uid()));

-- Allow admins to read all messages (optional, for debugging/monitoring)
CREATE POLICY "Admins can read all messages" ON mail_messages
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
