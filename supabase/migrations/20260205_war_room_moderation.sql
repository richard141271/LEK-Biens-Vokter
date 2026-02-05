ALTER TABLE warroom_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE warroom_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add RLS policies for Admin update/delete if not exists
-- Actually, using adminClient bypasses RLS, so mostly needed for safety or if we switch to client.
-- But standard users should not update/delete.
-- Admin user is 'richard141271@gmail.com'.
