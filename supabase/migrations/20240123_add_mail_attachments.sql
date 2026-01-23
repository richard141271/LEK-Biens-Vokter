-- Add attachments column to mail_messages table
ALTER TABLE mail_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
