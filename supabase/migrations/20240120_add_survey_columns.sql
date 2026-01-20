-- Add columns for survey_responses table if they don't exist

-- Common fields
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS is_beekeeper BOOLEAN;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS pilot_answer TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS pilot_interest BOOLEAN;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Beekeeper specific fields
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS number_of_hives_category TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS years_experience_category TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS is_member_norwegian_beekeepers BOOLEAN;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS experienced_disease BOOLEAN;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS disease_types TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS current_record_method TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS time_spent_documentation TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS value_warning_system INTEGER;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS value_nearby_alert INTEGER;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS value_reporting INTEGER;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS value_better_overview INTEGER;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS would_use_system_choice TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS willingness_to_pay TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS biggest_challenge TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS feature_wishes TEXT;

-- Non-beekeeper specific fields
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS eats_honey TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS rental_interest TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS rental_price TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS pollinator_importance TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS digital_tool_interest TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS disease_awareness TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS knowledge_about_beekeeping TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS considered_starting_beekeeping TEXT;

-- Make sure RLS is enabled and policies exist (optional, but good practice)
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (if not already set)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'survey_responses' 
        AND policyname = 'Allow anonymous inserts'
    ) THEN
        CREATE POLICY "Allow anonymous inserts" ON survey_responses FOR INSERT WITH CHECK (true);
    END IF;
END
$$;
