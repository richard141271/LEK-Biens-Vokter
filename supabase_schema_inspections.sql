-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hive_id UUID REFERENCES hives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,
  time TIME DEFAULT CURRENT_TIME,
  temperature NUMERIC,
  weather TEXT,
  note TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'OK', -- OK, SVAK, SYKDOM, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add fields to apiaries table if they don't exist
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bigård'; -- bigård, lager, butikk, bil, oppstart
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS registration_number TEXT; -- For biler (skiltnummer)

-- RLS for inspections
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inspections" 
  ON inspections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inspections" 
  ON inspections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections" 
  ON inspections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections" 
  ON inspections FOR DELETE 
  USING (auth.uid() = user_id);
