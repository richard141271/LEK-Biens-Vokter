-- Fix policies for Founder Module

-- Allow users to delete their own agreement checks (uncheck)
CREATE POLICY "Users can delete own checks" ON founder_agreement_checks FOR DELETE USING (founder_id = auth.uid());

-- Allow users to insert into timeline (for signing events etc)
CREATE POLICY "Users can insert own timeline" ON founder_timeline FOR INSERT WITH CHECK (founder_id = auth.uid());
