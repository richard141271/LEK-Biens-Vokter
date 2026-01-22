-- KOPIER HELE DENNE TEKSTEN OG KJØR DEN I SUPABASE SQL EDITOR

-- 1. Fiks inspeksjoner (sikre at beekeeper_id kan settes til NULL)
ALTER TABLE inspections ALTER COLUMN beekeeper_id DROP NOT NULL;

-- 2. Fiks bigårder (sikre at managed_by kan settes til NULL)
ALTER TABLE apiaries ALTER COLUMN managed_by DROP NOT NULL;

-- 3. Oppdater funksjonen for sletting av brukere
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

  -- Rentals: Beekeeper delivery (beekeeper_id) - HVIS DEN FINNES
  BEGIN
    UPDATE rentals
    SET beekeeper_id = NULL
    WHERE beekeeper_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer hvis kolonnen ikke finnes eller annen feil
  END;

  -- Inspections: Beekeeper
  UPDATE inspections
  SET beekeeper_id = NULL
  WHERE beekeeper_id = target_user_id;

  -- Apiaries: Manager
  UPDATE apiaries
  SET managed_by = NULL
  WHERE managed_by = target_user_id;

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
  
  -- Slett møtenotater
  DELETE FROM meeting_notes WHERE user_id = target_user_id;

  -- 5) Slett MLM data
  UPDATE profiles SET referrer_id = NULL WHERE referrer_id = target_user_id;
  DELETE FROM commissions WHERE beneficiary_id = target_user_id OR source_user_id = target_user_id;
  DELETE FROM honey_transactions WHERE buyer_id = target_user_id OR seller_id = target_user_id;
  DELETE FROM honey_listings WHERE seller_id = target_user_id;

  -- 6) Slett storage objects (viktig for auth deletion!)
  DELETE FROM storage.objects WHERE owner = target_user_id;

  -- 7) Slett profil
  DELETE FROM profiles WHERE id = target_user_id;

  -- Merk: auth.users slettes via Supabase Admin API i server action
END;
$$ LANGUAGE plpgsql;
