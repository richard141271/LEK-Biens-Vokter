-- KOPIER HELE DENNE TEKSTEN OG KJØR DEN I SUPABASE SQL EDITOR

-- 1. Prøv å gjøre kolonner nullable HVIS de finnes (bruker dynamisk SQL for å unngå feil)
DO $$
BEGIN
    -- Sjekk inspections.beekeeper_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'beekeeper_id') THEN
        ALTER TABLE inspections ALTER COLUMN beekeeper_id DROP NOT NULL;
    END IF;

    -- Sjekk apiaries.managed_by
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apiaries' AND column_name = 'managed_by') THEN
        ALTER TABLE apiaries ALTER COLUMN managed_by DROP NOT NULL;
    END IF;
END $$;

-- 2. Oppdater funksjonen for sletting av brukere (med sjekk for om kolonner finnes)
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Check if requester is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 1) Løs opp koblinger som peker på brukeren
  
  -- Rentals: Assigned beekeeper
  UPDATE rentals
  SET assigned_beekeeper_id = NULL
  WHERE assigned_beekeeper_id = target_user_id;

  -- Rentals: Owner (user_id)
  UPDATE rentals
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- Rentals: Beekeeper delivery (beekeeper_id) - Dynamisk sjekk
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rentals' AND column_name = 'beekeeper_id') THEN
      EXECUTE 'UPDATE rentals SET beekeeper_id = NULL WHERE beekeeper_id = $1' USING target_user_id;
  END IF;

  -- Inspections: Beekeeper - Dynamisk sjekk
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'beekeeper_id') THEN
      EXECUTE 'UPDATE inspections SET beekeeper_id = NULL WHERE beekeeper_id = $1' USING target_user_id;
  END IF;

  -- Apiaries: Manager - Dynamisk sjekk
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apiaries' AND column_name = 'managed_by') THEN
      EXECUTE 'UPDATE apiaries SET managed_by = NULL WHERE managed_by = $1' USING target_user_id;
  END IF;

  -- 2) Slett relaterte logger
  DELETE FROM hive_logs
  USING hives
  WHERE hive_logs.hive_id = hives.id
  AND hives.user_id = target_user_id;

  DELETE FROM hive_logs
  WHERE user_id = target_user_id;

  -- 3) Slett kuber og bigårder
  DELETE FROM hives WHERE user_id = target_user_id;
  DELETE FROM apiaries WHERE user_id = target_user_id;

  -- 4) Slett survey, pilot data og møtenotater
  DELETE FROM survey_responses WHERE user_id = target_user_id;
  DELETE FROM pilot_interest WHERE user_id = target_user_id;
  DELETE FROM survey_pilot_interest WHERE user_id = target_user_id;
  DELETE FROM market_survey_responses WHERE user_id = target_user_id;
  
  -- Slett møtenotater (Sjekk om tabellen finnes for sikkerhets skyld)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_notes') THEN
    DELETE FROM meeting_notes WHERE user_id = target_user_id;
  END IF;

  -- 5) Slett MLM data
  UPDATE profiles SET referrer_id = NULL WHERE referrer_id = target_user_id;
  DELETE FROM commissions WHERE beneficiary_id = target_user_id OR source_user_id = target_user_id;
  DELETE FROM honey_transactions WHERE buyer_id = target_user_id OR seller_id = target_user_id;
  DELETE FROM honey_listings WHERE seller_id = target_user_id;

  -- 6) Slett storage objects
  DELETE FROM storage.objects WHERE owner = target_user_id;

  -- 7) Slett profil
  DELETE FROM profiles WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql;
