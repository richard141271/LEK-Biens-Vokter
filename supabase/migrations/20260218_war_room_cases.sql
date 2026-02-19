DO $$ BEGIN
    CREATE TYPE case_type AS ENUM ('IDEA', 'PLAN', 'CASE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE case_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE case_update_type AS ENUM ('COMMENT', 'STATUS_CHANGE', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type case_type NOT NULL,
    status case_status NOT NULL DEFAULT 'OPEN',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS case_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type case_update_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cases select" ON cases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cases insert" ON cases
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Cases update own assigned" ON cases
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR auth.uid() = assigned_to)
WITH CHECK (true);

CREATE POLICY "Case updates select" ON case_updates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Case updates insert" ON case_updates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Case attachments select" ON case_attachments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Case attachments insert" ON case_attachments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

