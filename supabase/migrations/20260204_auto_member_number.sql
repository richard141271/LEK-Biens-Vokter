-- Migration to add sequence and trigger for auto-generating member_number

-- 1. Create a sequence starting at 10000
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 10000;

-- 2. Create a function to generate the next member number
CREATE OR REPLACE FUNCTION generate_member_number() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_number IS NULL OR NEW.member_number = '' THEN
    NEW.member_number := nextval('member_number_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger to call the function before insert
DROP TRIGGER IF EXISTS set_member_number_trigger ON profiles;
CREATE TRIGGER set_member_number_trigger
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION generate_member_number();

-- 4. Update existing profiles that don't have a member number
-- We use a DO block to update them one by one or in batch using the sequence
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE member_number IS NULL OR member_number = ''
    LOOP
        UPDATE profiles 
        SET member_number = nextval('member_number_seq')::TEXT
        WHERE id = r.id;
    END LOOP;
END;
$$;
