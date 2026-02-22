-- Add core id fields to apiaries and hives for LEK Core integration

ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS core_apiary_id TEXT;

ALTER TABLE hives
ADD COLUMN IF NOT EXISTS core_hive_id TEXT;

