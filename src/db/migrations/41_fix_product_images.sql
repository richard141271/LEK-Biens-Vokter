-- Fix product images with correct files
-- This migration updates existing products to point to the correct image files

-- LEK-Honning Sommer / Sommerhonning
UPDATE products 
SET image_url = '/BILDER/IMG_0987.JPG' 
WHERE name IN ('LEK-Honning Sommer', 'Sommerhonning');

-- Gavepakke "Biens Beste"
UPDATE products 
SET image_url = '/BILDER/F540572D-6909-4756-8C9E-E7C8FC465DF8.png' 
WHERE name = 'Gavepakke "Biens Beste"';

-- Gavepakke "Eksklusiv Svart"
UPDATE products 
SET image_url = '/BILDER/449D79D6-A20B-4B22-B328-D9BB5544BD3A.png' 
WHERE name = 'Gavepakke "Eksklusiv Svart"';

-- Gavepakke "Tårnet"
UPDATE products 
SET image_url = '/BILDER/0DF4E1BA-71EA-41F8-8C7E-9FF8E1A8A947.png' 
WHERE name = 'Gavepakke "Tårnet"';

-- Gavepakke "Duo Svart"
UPDATE products 
SET image_url = '/BILDER/2FF2EF66-C1D5-4309-AFFE-CE447D901FFA.png' 
WHERE name = 'Gavepakke "Duo Svart"';
