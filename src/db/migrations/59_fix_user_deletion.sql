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
  UPDATE rentals
  SET assigned_beekeeper_id = NULL
  WHERE assigned_beekeeper_id = target_user_id;

  UPDATE rentals
  SET user_id = NULL
  WHERE user_id = target_user_id;

  UPDATE inspections
  SET beekeeper_id = NULL
  WHERE beekeeper_id = target_user_id;

  -- Ny: Fjern bruker som manager for bigårder
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
  
  -- Ny: Slett møtenotater (har cascade, men greit å være eksplisitt for rekkefølge)
  DELETE FROM meeting_notes WHERE user_id = target_user_id;

  -- 5) Slett MLM data
  UPDATE profiles SET referrer_id = NULL WHERE referrer_id = target_user_id;
  DELETE FROM commissions WHERE beneficiary_id = target_user_id OR source_user_id = target_user_id;
  DELETE FROM honey_transactions WHERE buyer_id = target_user_id OR seller_id = target_user_id;
  DELETE FROM honey_listings WHERE seller_id = target_user_id;

  -- 6) Slett storage objects (viktig!)
  DELETE FROM storage.objects WHERE owner = target_user_id;

  -- 7) Slett profil
  DELETE FROM profiles WHERE id = target_user_id;

  -- Merk: auth.users slettes via Supabase Admin API i server action
END;
$$ LANGUAGE plpgsql;
