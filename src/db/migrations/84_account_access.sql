CREATE TABLE IF NOT EXISTS account_access (
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'family', 'substitute')),
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (owner_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_account_access_member_id ON account_access(member_id);

CREATE TABLE IF NOT EXISTS account_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'family', 'substitute')),
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_invites_token ON account_invites(token);
CREATE INDEX IF NOT EXISTS idx_account_invites_owner_id ON account_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_account_invites_email ON account_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_account_invites_expires_at ON account_invites(expires_at);

ALTER TABLE account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Account access selectable by owner or member" ON account_access;
CREATE POLICY "Account access selectable by owner or member"
  ON account_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "Account access manageable by owner" ON account_access;
CREATE POLICY "Account access manageable by owner"
  ON account_access
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Account invites selectable by owner" ON account_invites;
CREATE POLICY "Account invites selectable by owner"
  ON account_invites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Account invites manageable by owner" ON account_invites;
CREATE POLICY "Account invites manageable by owner"
  ON account_invites
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Account members can view apiaries" ON apiaries;
CREATE POLICY "Account members can view apiaries"
  ON apiaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiaries.user_id
        AND aa.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Account members can write apiaries" ON apiaries;
CREATE POLICY "Account members can write apiaries"
  ON apiaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiaries.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can update apiaries" ON apiaries;
CREATE POLICY "Account members can update apiaries"
  ON apiaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiaries.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiaries.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can delete apiaries" ON apiaries;
CREATE POLICY "Account members can delete apiaries"
  ON apiaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = apiaries.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_delete = true
    )
  );

DROP POLICY IF EXISTS "Account members can view hives" ON hives;
CREATE POLICY "Account members can view hives"
  ON hives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = hives.user_id
        AND aa.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Account members can write hives" ON hives;
CREATE POLICY "Account members can write hives"
  ON hives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = hives.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can update hives" ON hives;
CREATE POLICY "Account members can update hives"
  ON hives
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = hives.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = hives.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can delete hives" ON hives;
CREATE POLICY "Account members can delete hives"
  ON hives
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM account_access aa
      WHERE aa.owner_id = hives.user_id
        AND aa.member_id = auth.uid()
        AND aa.can_delete = true
    )
  );

DROP POLICY IF EXISTS "Owners can view logs for own hives" ON hive_logs;
CREATE POLICY "Owners can view logs for own hives"
  ON hive_logs
  FOR SELECT
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      WHERE h.id = hive_logs.hive_id
        AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Account members can view logs for shared hives" ON hive_logs;
CREATE POLICY "Account members can view logs for shared hives"
  ON hive_logs
  FOR SELECT
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = hive_logs.hive_id
        AND aa.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Account members can insert logs for shared hives" ON hive_logs;
CREATE POLICY "Account members can insert logs for shared hives"
  ON hive_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = hive_logs.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can update logs for shared hives" ON hive_logs;
CREATE POLICY "Account members can update logs for shared hives"
  ON hive_logs
  FOR UPDATE
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = hive_logs.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can delete logs for shared hives" ON hive_logs;
CREATE POLICY "Account members can delete logs for shared hives"
  ON hive_logs
  FOR DELETE
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = hive_logs.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_delete = true
    )
  );

DROP POLICY IF EXISTS "Account members can view inspections for shared hives" ON inspections;
CREATE POLICY "Account members can view inspections for shared hives"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = inspections.hive_id
        AND aa.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Account members can write inspections for shared hives" ON inspections;
CREATE POLICY "Account members can write inspections for shared hives"
  ON inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = inspections.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can update inspections for shared hives" ON inspections;
CREATE POLICY "Account members can update inspections for shared hives"
  ON inspections
  FOR UPDATE
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = inspections.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_write = true
    )
  );

DROP POLICY IF EXISTS "Account members can delete inspections for shared hives" ON inspections;
CREATE POLICY "Account members can delete inspections for shared hives"
  ON inspections
  FOR DELETE
  TO authenticated
  USING (
    hive_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM hives h
      JOIN account_access aa ON aa.owner_id = h.user_id
      WHERE h.id = inspections.hive_id
        AND aa.member_id = auth.uid()
        AND aa.can_delete = true
    )
  );

NOTIFY pgrst, 'reload schema';
