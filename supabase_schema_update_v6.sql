-- Extend survey_responses for advanced administration and spam protection

ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_invalid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS pilot_answer TEXT,
ADD COLUMN IF NOT EXISTS pilot_interest BOOLEAN DEFAULT FALSE;

-- Ensure pilot interest table can be used for one-response-per-email logic
ALTER TABLE survey_pilot_interest
ADD CONSTRAINT IF NOT EXISTS survey_pilot_interest_email_unique UNIQUE (email);
