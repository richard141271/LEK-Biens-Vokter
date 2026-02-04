-- Add is_founder to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_founder') THEN 
        ALTER TABLE profiles ADD COLUMN is_founder BOOLEAN DEFAULT FALSE; 
    END IF; 
END $$;

-- Founder Profiles
CREATE TABLE IF NOT EXISTS founder_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'reading', 'cooldown', 'active', 'exited')) DEFAULT 'invited',
  cooldown_until TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Founder Agreement Checks
CREATE TABLE IF NOT EXISTS founder_agreement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(founder_id, check_key)
);

-- Founder Ambitions
CREATE TABLE IF NOT EXISTS founder_ambitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  contribution TEXT,
  goal_30_days TEXT,
  goal_1_year TEXT,
  goal_5_years TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Founder Logs
CREATE TABLE IF NOT EXISTS founder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  did_since_last TEXT,
  plans_now TEXT,
  ideas TEXT,
  status_color TEXT CHECK (status_color IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Founder Timeline
CREATE TABLE IF NOT EXISTS founder_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_agreement_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_ambitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_timeline ENABLE ROW LEVEL SECURITY;

-- Policies for founder_profiles
CREATE POLICY "Users can view own founder profile" ON founder_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own founder profile" ON founder_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all founder profiles" ON founder_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert founder profiles" ON founder_profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policies for other tables (Owner access)
CREATE POLICY "Users can view own checks" ON founder_agreement_checks FOR SELECT USING (founder_id = auth.uid());
CREATE POLICY "Users can insert own checks" ON founder_agreement_checks FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY "Users can view own ambitions" ON founder_ambitions FOR SELECT USING (founder_id = auth.uid());
CREATE POLICY "Users can insert/update own ambitions" ON founder_ambitions FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "Users can view own logs" ON founder_logs FOR SELECT USING (founder_id = auth.uid());
CREATE POLICY "Users can insert own logs" ON founder_logs FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY "Users can view own timeline" ON founder_timeline FOR SELECT USING (founder_id = auth.uid());
-- Timeline is mostly system generated, but maybe user can trigger actions that write to it? 
-- We'll allow insert for now, but usually this is done via server actions with service role if it's strict system log.
-- Let's allow users to read. Writing might be done via postgres triggers or service role in actions.
