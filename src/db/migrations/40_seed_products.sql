-- Seed products with local images
-- This migration inserts the new products into the products table.
-- It does NOT delete existing products to be safe, but you might want to truncate if starting fresh.

INSERT INTO products (name, description, price, category, image_url, stock, is_active)
VALUES
(
    'LEK-Honning Sommer', 
    'Deilig, lys sommerhonning fra lokale bigårder. Mild og fin smak. Høstet med kjærlighet.', 
    149, 
    'Honning', 
    '/BILDER/IMG_0987.JPG', 
    50, 
    true
),
(
    'Gavepakke "Biens Beste"', 
    'En flott gaveeske med to glass honning og et stort glass. Perfekt for honningelskeren.', 
    499, 
    'Gavepakker', 
    '/BILDER/F540572D-6909-4756-8C9E-E7C8FC465DF8.png', 
    15, 
    true
),
(
    'Gavepakke "Eksklusiv Svart"', 
    'Vår mest eksklusive gavepakke i stilig svart utførelse. Inneholder et utvalg av våre beste produkter.', 
    699, 
    'Gavepakker', 
    '/BILDER/449D79D6-A20B-4B22-B328-D9BB5544BD3A.png', 
    10, 
    true
),
(
    'Gavepakke "Tårnet"', 
    'Et tårn av smaker! Tre glass honning og såpe i en elegant hvit gaveeske.', 
    549, 
    'Gavepakker', 
    '/BILDER/0DF4E1BA-71EA-41F8-8C7E-9FF8E1A8A947.png', 
    12, 
    true
),
(
    'Gavepakke "Duo Svart"', 
    'En lekker svart gaveeske med to utvalgte honningglass. En perfekt vertinnegave.', 
    349, 
    'Gavepakker', 
    '/BILDER/2FF2EF66-C1D5-4309-AFFE-CE447D901FFA.png', 
    20, 
    true
);
