
-- Add AI analysis result and admin status to hive_logs
ALTER TABLE hive_logs
ADD COLUMN IF NOT EXISTS ai_analysis_result jsonb,
ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'pending'; -- pending, investigating, resolved
