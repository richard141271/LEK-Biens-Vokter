-- Enable storage extension if not already enabled (usually enabled by default in Supabase)
-- insert into storage.buckets (id, name, public) values ('sickness-images', 'sickness-images', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('sickness-images', 'sickness-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sickness-images');

-- Policy: Allow public access to view images
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sickness-images');
