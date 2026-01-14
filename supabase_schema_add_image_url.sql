-- Legg til image_url kolonne i inspections tabellen
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Opprett storage bucket for bilder hvis den ikke finnes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inspection-images', 'inspection-images', true)
ON CONFLICT (id) DO NOTHING;

-- Slett eksisterende policies for å unngå duplikater (valgfritt, men trygt)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

-- Opprett policy for offentlig tilgang til å se bilder
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'inspection-images' );

-- Opprett policy for at innloggede brukere kan laste opp bilder
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'inspection-images' AND auth.role() = 'authenticated' );
