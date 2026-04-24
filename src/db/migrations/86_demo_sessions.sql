CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()) + interval '12 hours',
  ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_sessions_token_hash ON demo_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created_by ON demo_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created_at ON demo_sessions(created_at);

ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;
