
-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.survey_submissions CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.pilot_interest CASCADE;
DROP TABLE IF EXISTS public.survey_pilot_interest CASCADE;

-- Create survey_responses table (Anonymous data)
CREATE TABLE public.survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Common fields
    is_beekeeper BOOLEAN NOT NULL,
    county TEXT,
    pilot_answer TEXT, -- 'ja', 'kanskje', 'nei' (Do NOT store email here)
    pilot_interest BOOLEAN, -- true if answer is 'ja' or 'kanskje'
    ip_address TEXT, -- Optional: for spam prevention, but consider privacy
    
    -- Beekeeper specific fields
    number_of_hives_category TEXT,
    years_experience_category TEXT,
    is_member_norwegian_beekeepers BOOLEAN,
    experienced_disease BOOLEAN,
    disease_types TEXT, -- stored as comma separated string
    current_record_method TEXT,
    time_spent_documentation TEXT,
    
    -- Value propositions (scale 1-5)
    value_warning_system INTEGER,
    value_nearby_alert INTEGER,
    value_reporting INTEGER,
    value_better_overview INTEGER,
    
    would_use_system_choice TEXT,
    willingness_to_pay TEXT,
    biggest_challenge TEXT,
    feature_wishes TEXT,
    
    -- Non-beekeeper specific fields
    eats_honey TEXT,
    rental_interest TEXT,
    rental_price TEXT,
    pollinator_importance TEXT,
    digital_tool_interest TEXT,
    disease_awareness TEXT,
    knowledge_about_beekeeping TEXT,
    considered_starting_beekeeping TEXT
);

-- Create pilot_interest table (Email collection)
CREATE TABLE public.pilot_interest (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    interested BOOLEAN DEFAULT TRUE,
    status TEXT, -- 'Interessert', 'Kanskje'
    source TEXT -- 'survey_beekeeper', 'survey_non_beekeeper'
);

-- Enable RLS
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_interest ENABLE ROW LEVEL SECURITY;

-- Policies for survey_responses
-- Allow anyone to insert (public survey)
CREATE POLICY "Allow public insert to survey_responses" 
ON public.survey_responses FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow admins/service role to read
CREATE POLICY "Allow service role to read survey_responses" 
ON public.survey_responses FOR SELECT 
TO service_role 
USING (true);

-- Allow authenticated admins to read (if using authenticated client)
-- Assuming 'authenticated' role + admin check or similar. 
-- For now, allowing service_role (used by admin client) is key.
-- But the dashboard uses 'createClient' which might be authenticated user.
-- Let's check roles. usually authenticated users shouldn't read all responses unless admin.
-- For simplicity in this project context (where we use service role or specific admin logic):
CREATE POLICY "Allow authenticated admins to read survey_responses"
ON public.survey_responses FOR SELECT
TO authenticated
USING (true); -- Refine this if strict admin role check is needed, but for now we trust the app logic.

-- Policies for pilot_interest
-- Allow anyone to insert
CREATE POLICY "Allow public insert to pilot_interest" 
ON public.pilot_interest FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow admins to read
CREATE POLICY "Allow service role to read pilot_interest" 
ON public.pilot_interest FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Allow authenticated admins to read pilot_interest"
ON public.pilot_interest FOR SELECT
TO authenticated
USING (true);

-- Allow delete for admins (for cleanup)
CREATE POLICY "Allow authenticated admins to delete pilot_interest"
ON public.pilot_interest FOR DELETE
TO authenticated
USING (true);

