-- Fix RLS policies for Admin access to Founder Module
-- Also ensures specific admin email has access regardless of role claim

-- 1. founder_profiles
DROP POLICY IF EXISTS "Admins can view all founder profiles" ON founder_profiles;
CREATE POLICY "Admins can view all founder profiles" ON founder_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
);

-- 2. founder_agreement_checks
CREATE POLICY "Admins can view all checks" ON founder_agreement_checks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
);

-- 3. founder_ambitions
CREATE POLICY "Admins can view all ambitions" ON founder_ambitions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
);

-- 4. founder_logs
CREATE POLICY "Admins can view all logs" ON founder_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
);

-- 5. founder_timeline
CREATE POLICY "Admins can view all timeline" ON founder_timeline FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
);

-- WAR ROOM (Community) Module

CREATE TABLE IF NOT EXISTS founder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE founder_messages ENABLE ROW LEVEL SECURITY;

-- Founders can view all messages
CREATE POLICY "Founders can view all messages" ON founder_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM founder_profiles WHERE id = auth.uid() AND status IN ('active', 'reading', 'cooldown'))
  OR (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Founders can insert their own messages
CREATE POLICY "Founders can insert own messages" ON founder_messages FOR INSERT WITH CHECK (
  founder_id = auth.uid()
  AND EXISTS (SELECT 1 FROM founder_profiles WHERE id = auth.uid() AND status IN ('active', 'reading', 'cooldown'))
);

-- Admin can insert messages (acting as a founder or system?)
-- If admin wants to post, they need a founder_id? 
-- Or we make founder_id nullable?
-- Or Admin has a founder_profile? (Admin usually doesn't).
-- Let's make founder_id nullable and add 'author_name' or similar?
-- No, let's keep it simple. Admin posts as "System" or we require Admin to have a founder profile?
-- The user (Richard) likely has a founder profile (he is testing).
-- So let's stick to founder_id. If Richard logs in, he posts as himself.

-- Allow Admin to DELETE messages (moderation)
CREATE POLICY "Admins can delete messages" ON founder_messages FOR DELETE USING (
  (auth.jwt() ->> 'email') = 'richard141271@gmail.com'
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
