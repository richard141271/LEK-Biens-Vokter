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
    '/BILDER/59896CE9-7983-4E4E-A436-67C9A2FFE599.png', 
    50, 
    true
),
(
    'Gavepakke "Biens Beste"', 
    'En flott gaveeske med to glass honning og et stort glass. Perfekt for honningelskeren.', 
    499, 
    'Gavepakker', 
    '/BILDER/0AFA6AF8-4EB6-4A37-A6B2-009E51D464C3.png', 
    15, 
    true
),
(
    'Gavepakke "Eksklusiv Svart"', 
    'Vår mest eksklusive gavepakke i stilig svart utførelse. Inneholder et utvalg av våre beste produkter.', 
    699, 
    'Gavepakker', 
    '/BILDER/5CA85119-ED8D-4F45-A6D5-F9C0A8C2D6C4.png', 
    10, 
    true
),
(
    'Gavepakke "Tårnet"', 
    'Et tårn av smaker! Tre glass honning og såpe i en elegant hvit gaveeske.', 
    549, 
    'Gavepakker', 
    '/BILDER/DEB0F3F6-40D7-4B31-B5DA-0D4FF5DCD7B8.png', 
    12, 
    true
),
(
    'Gavepakke "Duo Svart"', 
    'En lekker svart gaveeske med to utvalgte honningglass. En perfekt vertinnegave.', 
    349, 
    'Gavepakker', 
    '/BILDER/9ED45680-F7FC-46B2-903E-7222F976DA7E.png', 
    20, 
    true
);
