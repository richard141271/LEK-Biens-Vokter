-- Add archiving fields to hives table
ALTER TABLE hives 
ADD COLUMN IF NOT EXISTS archive_reason TEXT, -- 'SOLGT', 'DESTRUERT', 'SYKDOM' etc.
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add index for faster filtering of active/inactive hives
CREATE INDEX IF NOT EXISTS idx_hives_active ON hives(active);
