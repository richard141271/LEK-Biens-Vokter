
-- Fix missing foreign key relationship between founder_profiles and profiles
-- This is necessary for PostgREST to detect the relationship for joins

DO $$
BEGIN
    -- Check if the constraint exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'founder_profiles_id_fkey' 
        AND table_name = 'founder_profiles'
    ) THEN
        ALTER TABLE "public"."founder_profiles"
        ADD CONSTRAINT "founder_profiles_id_fkey"
        FOREIGN KEY ("id")
        REFERENCES "public"."profiles" ("id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also ensuring explicit foreign key for PostgREST detection if it was missing
COMMENT ON CONSTRAINT "founder_profiles_id_fkey" ON "public"."founder_profiles" IS 'Links founder profile to main user profile';
