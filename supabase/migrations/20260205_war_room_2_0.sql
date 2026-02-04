-- War Room 2.0 Schema

-- Enums (IF NOT EXISTS workaround for enums in Postgres)
DO $$ BEGIN
    CREATE TYPE warroom_post_type AS ENUM ('done', 'plan', 'help', 'idea', 'problem');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE warroom_status_color AS ENUM ('green', 'yellow', 'red');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- War Room Posts
CREATE TABLE IF NOT EXISTS warroom_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type warroom_post_type NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Focus
CREATE TABLE IF NOT EXISTS warroom_daily_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE UNIQUE,
  created_by UUID REFERENCES auth.users(id)
);

-- User Status (Real-time dashboard)
CREATE TABLE IF NOT EXISTS warroom_user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  working_on TEXT,
  status_color warroom_status_color DEFAULT 'green',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas (Auto-generated from posts)
CREATE TABLE IF NOT EXISTS warroom_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES warroom_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE warroom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_daily_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_ideas ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone (authenticated) can read everything in War Room
CREATE POLICY "View all posts" ON warroom_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create posts" ON warroom_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View daily focus" ON warroom_daily_focus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage daily focus" ON warroom_daily_focus FOR ALL TO authenticated USING (true);

CREATE POLICY "View user statuses" ON warroom_user_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Update own status" ON warroom_user_status FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View ideas" ON warroom_ideas FOR SELECT TO authenticated USING (true);
-- Allow inserting ideas if you own the linked post
CREATE POLICY "Insert ideas" ON warroom_ideas FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM warroom_posts WHERE id = post_id AND user_id = auth.uid())
);
