-- Update inspections table to match application code
DROP TABLE IF EXISTS inspections;

CREATE TABLE inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inspection_date DATE DEFAULT CURRENT_DATE,
  queen_seen BOOLEAN DEFAULT FALSE,
  eggs_seen BOOLEAN DEFAULT FALSE,
  brood_condition TEXT, -- 'darlig', 'normal', 'bra'
  honey_stores TEXT, -- 'lite', 'middels', 'mye'
  temperament TEXT, -- 'rolig', 'urolig', 'aggressiv'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hive_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS hive_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'OPPRETTET', 'FLYTTET', 'INSPEKSJON', etc.
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure apiaries has the correct fields
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bigård';
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- RLS Policies

-- Inspections
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inspections" ON inspections;
CREATE POLICY "Users can view own inspections" ON inspections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inspections" ON inspections;
CREATE POLICY "Users can insert own inspections" ON inspections FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Hive Logs
ALTER TABLE hive_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own hive logs" ON hive_logs;
CREATE POLICY "Users can view own hive logs" ON hive_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own hive logs" ON hive_logs;
CREATE POLICY "Users can insert own hive logs" ON hive_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
