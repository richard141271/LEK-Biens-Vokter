-- Demo writing support (tagging + isolation)

ALTER TABLE demo_sessions
ADD COLUMN IF NOT EXISTS demo_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demo_sessions_demo_owner_id ON demo_sessions(demo_owner_id);

ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_apiaries_demo_session_id ON apiaries(demo_session_id);

ALTER TABLE hives
ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hives_demo_session_id ON hives(demo_session_id);

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_demo_session_id ON inspections(demo_session_id);

ALTER TABLE hive_logs
ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hive_logs_demo_session_id ON hive_logs(demo_session_id);

NOTIFY pgrst, 'reload schema';
