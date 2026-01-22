-- Fix apiaries unique constraint to be per-user instead of global
-- This allows multiple users to have "BG-001", "BG-002", etc.

-- First, drop the existing global unique constraint if it exists
ALTER TABLE apiaries DROP CONSTRAINT IF EXISTS apiaries_apiary_number_key;

-- Also drop the new constraint if it already exists (to make this idempotent)
ALTER TABLE apiaries DROP CONSTRAINT IF EXISTS apiaries_user_id_apiary_number_key;

-- Add new constraint that includes user_id
ALTER TABLE apiaries ADD CONSTRAINT apiaries_user_id_apiary_number_key UNIQUE (user_id, apiary_number);
