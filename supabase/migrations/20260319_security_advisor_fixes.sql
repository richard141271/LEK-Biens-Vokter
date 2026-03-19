ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_attachments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_or_inspector()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'mattilsynet')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_role text;
  user_email text;
BEGIN
  user_email := auth.jwt() ->> 'email';
  IF user_email = 'richard141271@gmail.com' THEN
    RETURN true;
  END IF;

  SELECT role INTO current_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN current_role = 'admin';
END;
$$;

ALTER TABLE IF EXISTS lek_core.beekeepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lek_core.apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lek_core.hives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LEK Core beekeepers select" ON lek_core.beekeepers;
CREATE POLICY "LEK Core beekeepers select"
ON lek_core.beekeepers
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR public.is_admin_or_inspector()
);

DROP POLICY IF EXISTS "LEK Core apiaries select" ON lek_core.apiaries;
CREATE POLICY "LEK Core apiaries select"
ON lek_core.apiaries
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_inspector()
  OR EXISTS (
    SELECT 1
    FROM lek_core.beekeepers b
    WHERE b.beekeeper_id = apiaries.beekeeper_id
      AND b.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "LEK Core hives select" ON lek_core.hives;
CREATE POLICY "LEK Core hives select"
ON lek_core.hives
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_inspector()
  OR EXISTS (
    SELECT 1
    FROM lek_core.apiaries a
    JOIN lek_core.beekeepers b ON b.beekeeper_id = a.beekeeper_id
    WHERE a.apiary_id = hives.apiary_id
      AND b.auth_user_id = auth.uid()
  )
);

GRANT USAGE ON SCHEMA lek_core TO authenticated;
GRANT SELECT ON TABLE lek_core.beekeepers TO authenticated;
GRANT SELECT ON TABLE lek_core.apiaries TO authenticated;
GRANT SELECT ON TABLE lek_core.hives TO authenticated;

CREATE OR REPLACE VIEW public.lek_core_beekeepers
WITH (security_invoker = true)
AS
SELECT *
FROM lek_core.beekeepers;

CREATE OR REPLACE VIEW public.lek_core_apiaries
WITH (security_invoker = true)
AS
SELECT *
FROM lek_core.apiaries;

CREATE OR REPLACE VIEW public.lek_core_hives
WITH (security_invoker = true)
AS
SELECT *
FROM lek_core.hives;

CREATE TABLE IF NOT EXISTS public.referral_edges (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS referral_edges_referrer_id_idx ON public.referral_edges(referrer_id);

CREATE OR REPLACE FUNCTION public.sync_referral_edges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.referral_edges (user_id, referrer_id)
  VALUES (NEW.id, NEW.referrer_id)
  ON CONFLICT (user_id)
  DO UPDATE SET referrer_id = EXCLUDED.referrer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_referral_edges ON public.profiles;
CREATE TRIGGER trg_sync_referral_edges
AFTER INSERT OR UPDATE OF referrer_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_referral_edges();

INSERT INTO public.referral_edges (user_id, referrer_id)
SELECT id, referrer_id
FROM public.profiles
ON CONFLICT (user_id)
DO UPDATE SET referrer_id = EXCLUDED.referrer_id;

CREATE OR REPLACE VIEW public.view_mlm_monthly_projection
WITH (security_invoker = true)
AS
WITH RECURSIVE downline AS (
  SELECT
    user_id,
    referrer_id AS upline_id,
    1 AS level
  FROM public.referral_edges
  WHERE referrer_id IS NOT NULL

  UNION ALL

  SELECT
    r.user_id,
    d.upline_id,
    d.level + 1
  FROM public.referral_edges r
  JOIN downline d ON r.referrer_id = d.user_id
  WHERE d.level < 3
),
agg AS (
  SELECT
    upline_id AS user_id,
    COUNT(*) FILTER (WHERE level = 1) AS level_1_count,
    COUNT(*) FILTER (WHERE level = 2) AS level_2_count,
    COUNT(*) FILTER (WHERE level = 3) AS level_3_count,
    (COUNT(*) FILTER (WHERE level = 1) * 50) +
    (COUNT(*) FILTER (WHERE level = 2) * 30) +
    (COUNT(*) FILTER (WHERE level = 3) * 10) AS estimated_monthly_earnings
  FROM downline
  GROUP BY upline_id
)
SELECT
  me.user_id,
  COALESCE(a.level_1_count, 0) AS level_1_count,
  COALESCE(a.level_2_count, 0) AS level_2_count,
  COALESCE(a.level_3_count, 0) AS level_3_count,
  COALESCE(a.estimated_monthly_earnings, 0) AS estimated_monthly_earnings
FROM (SELECT auth.uid() AS user_id) me
LEFT JOIN agg a ON a.user_id = me.user_id
WHERE me.user_id IS NOT NULL;
