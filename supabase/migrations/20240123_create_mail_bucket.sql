-- Create mail-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('mail-attachments', 'mail-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload mail attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mail-attachments');

-- Policy to allow authenticated users to view files
CREATE POLICY "Authenticated users can view mail attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mail-attachments');

-- Policy to allow users to delete their own files (optional but good)
CREATE POLICY "Users can delete their own mail attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mail-attachments' AND auth.uid() = owner);
