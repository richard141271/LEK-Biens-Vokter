CREATE TABLE IF NOT EXISTS user_voice_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  phrase TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_voice_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_voice_aliases" ON user_voice_aliases;
CREATE POLICY "Users manage own user_voice_aliases"
  ON user_voice_aliases
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP INDEX IF EXISTS idx_user_voice_aliases_user;
CREATE INDEX idx_user_voice_aliases_user ON user_voice_aliases(user_id);
