-- Update products with new images and add Tavlehonning
-- Updates based on user feedback to swap images and add a new product

-- 1. Update Sommerhonning with the image previously used for Duo Svart
UPDATE products 
SET image_url = '/BILDER/2FF2EF66-C1D5-4309-AFFE-CE447D901FFA.png' 
WHERE name IN ('LEK-Honning Sommer', 'Sommerhonning');

-- 2. Update Duo Svart with the new "Black Box" image
UPDATE products 
SET image_url = '/BILDER/49E86A27-AA55-4D06-A4CE-D02BE63DBA4F.png'
WHERE name = 'Gavepakke "Duo Svart"';

-- 3. Add new product: Tavlehonning
INSERT INTO products (name, description, price, category, image_url, stock, is_active)
VALUES (
    'Tavlehonning',
    'Deilig tavlehonning servert i en rustikk trekasse. Ekte vare rett fra bikuben.',
    450,
    'Honning',
    '/BILDER/612A0805-7459-41E4-A37F-24672786BC0D.png',
    5,
    true
);
