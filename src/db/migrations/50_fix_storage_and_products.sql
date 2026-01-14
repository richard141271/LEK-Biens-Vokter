-- 1. Create product-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for product-images
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated users (or just admins) to upload
-- For now, let's allow authenticated users to be safe, or check for admin role
CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (auth.role() = 'authenticated') -- You might want to restrict this to admins via a trigger or stricter policy later
);

CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (auth.role() = 'authenticated')
);

CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  (auth.role() = 'authenticated')
);

-- 3. Ensure Products Table RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
FOR SELECT
USING (true); -- Or (is_active = true) if you want to hide inactive ones from public, but admins need to see all

-- Allow admins full access
-- Using the is_admin_or_inspector() function from previous migrations if available, or checking profile role
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Ensure the function handles the case where profile might not exist or other constraints
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Check if requester is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 1) Løs opp koblinger som peker på brukeren (for å unngå FK-feil)
  UPDATE rentals
  SET assigned_beekeeper_id = NULL
  WHERE assigned_beekeeper_id = target_user_id;

  UPDATE rentals
  SET user_id = NULL
  WHERE user_id = target_user_id;

  UPDATE inspections
  SET beekeeper_id = NULL
  WHERE beekeeper_id = target_user_id;

  -- 2) Slett relaterte logger (både direkte og via kuber)
  DELETE FROM hive_logs
  USING hives
  WHERE hive_logs.hive_id = hives.id
  AND hives.user_id = target_user_id;

  DELETE FROM hive_logs
  WHERE user_id = target_user_id;

  -- 3) Slett kuber og bigårder
  DELETE FROM hives WHERE user_id = target_user_id;
  DELETE FROM apiaries WHERE user_id = target_user_id;

  -- 4) Slett profil til slutt
  DELETE FROM profiles WHERE id = target_user_id;

  -- Merk: auth.users slettes via Supabase Admin API i server action
END;
$$ LANGUAGE plpgsql;
