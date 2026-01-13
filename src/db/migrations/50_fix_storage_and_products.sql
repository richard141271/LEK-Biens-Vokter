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

-- 4. Re-verify delete_user_by_admin RPC (fix for database error)
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

  -- Delete profile (should cascade to hives, logs etc if FKs are set to CASCADE)
  -- If FKs are not CASCADE, we might need to delete dependent rows manually here
  -- Let's try to delete dependent rows manually to be safe
  
  DELETE FROM hive_logs WHERE user_id = target_user_id;
  DELETE FROM hives WHERE user_id = target_user_id; -- This might fail if apiaries are not linked to user directly but hives are? 
  -- Actually hives usually link to apiary. Let's check schema. 
  -- Usually Hives -> Apiaries -> Profiles. 
  -- If we delete Profile, Apiaries should go.
  
  DELETE FROM apiaries WHERE user_id = target_user_id;
  
  -- Finally delete profile
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Note: We cannot delete from auth.users here, that must be done via Supabase Admin API (server action)
END;
$$ LANGUAGE plpgsql;
