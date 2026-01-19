-- Migration to add columns for non-beekeeper survey and pilot separation

-- 1. Add columns to survey_responses for non-beekeeper questions
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS is_beekeeper BOOLEAN,
ADD COLUMN IF NOT EXISTS eats_honey TEXT, -- 'ja', 'nei', 'vet_ikke'
ADD COLUMN IF NOT EXISTS rental_interest TEXT, -- 'ja', 'nei', 'vet_ikke'
ADD COLUMN IF NOT EXISTS rental_price TEXT, -- price ranges
ADD COLUMN IF NOT EXISTS pollinator_importance TEXT, -- 'ja', 'nei', 'vet_ikke'
ADD COLUMN IF NOT EXISTS digital_tool_interest TEXT, -- 'ja', 'nei', 'vet_ikke'
ADD COLUMN IF NOT EXISTS disease_awareness TEXT, -- 'ja', 'nei', 'usikker'
ADD COLUMN IF NOT EXISTS knowledge_about_beekeeping TEXT, -- open text
ADD COLUMN IF NOT EXISTS considered_starting_beekeeping TEXT; -- open text

-- 2. Ensure pilot_interest has necessary columns (idempotent)
ALTER TABLE pilot_interest 
ADD COLUMN IF NOT EXISTS source TEXT, -- 'survey_beekeeper', 'survey_rental'
ADD COLUMN IF NOT EXISTS status TEXT; -- 'Interessert', 'Kanskje'

-- 3. Policy update (ensure inserts are allowed for public)
-- This is likely already done, but reinforcing for the new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pilot_interest' 
        AND policyname = 'Allow public insert pilot_interest'
    ) THEN
        CREATE POLICY "Allow public insert pilot_interest"
        ON pilot_interest
        FOR INSERT
        WITH CHECK (true);
    END IF;
END
$$;
