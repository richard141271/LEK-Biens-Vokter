-- Add email_signature to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_signature TEXT;

-- Create mail_folders table
CREATE TABLE IF NOT EXISTS mail_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- inbox, sent, trash, etc. or custom-slug
    type TEXT DEFAULT 'custom', -- system, custom
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- Add folder column to mail_messages if not exists
ALTER TABLE mail_messages ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'inbox';

-- Enable RLS
ALTER TABLE mail_folders ENABLE ROW LEVEL SECURITY;

-- Policies for mail_folders
CREATE POLICY "Users can view own folders" ON mail_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own folders" ON mail_folders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all folders" ON mail_folders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger to create default folders for new users
CREATE OR REPLACE FUNCTION create_default_mail_folders() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO mail_folders (user_id, name, slug, type) VALUES
    (NEW.id, 'Innboks', 'inbox', 'system'),
    (NEW.id, 'Sendt', 'sent', 'system'),
    (NEW.id, 'Utkast', 'drafts', 'system'),
    (NEW.id, 'Spam', 'spam', 'system'),
    (NEW.id, 'Papirkurv', 'trash', 'system');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS trigger_create_mail_folders ON profiles;
CREATE TRIGGER trigger_create_mail_folders
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_mail_folders();

-- Backfill existing users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles LOOP
        IF NOT EXISTS (SELECT 1 FROM mail_folders WHERE user_id = r.id AND slug = 'inbox') THEN
            INSERT INTO mail_folders (user_id, name, slug, type) VALUES
            (r.id, 'Innboks', 'inbox', 'system'),
            (r.id, 'Sendt', 'sent', 'system'),
            (r.id, 'Utkast', 'drafts', 'system'),
            (r.id, 'Spam', 'spam', 'system'),
            (r.id, 'Papirkurv', 'trash', 'system');
        END IF;
    END LOOP;
END;
$$;
