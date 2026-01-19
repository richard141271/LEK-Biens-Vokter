ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS pilot_answer TEXT,
ADD COLUMN IF NOT EXISTS pilot_interest BOOLEAN;

