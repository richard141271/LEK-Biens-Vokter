-- Update images for Duo Svart and Tavlehonning
-- Tavlehonning uses the image previously assigned to Duo Svart
-- Duo Svart uses a new Gemini generated image

-- 1. Update Tavlehonning (Hel tavle)
UPDATE products 
SET image_url = '/BILDER/49E86A27-AA55-4D06-A4CE-D02BE63DBA4F.png'
WHERE name = 'Tavlehonning (Hel tavle)';

-- 2. Update Gavepakke "Duo Svart"
UPDATE products 
SET image_url = '/BILDER/Gemini_Generated_Image_ad460rad460rad46.jpeg'
WHERE name = 'Gavepakke "Duo Svart"';
