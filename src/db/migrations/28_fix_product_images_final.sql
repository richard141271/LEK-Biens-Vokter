-- Update product images with verified URLs to avoid "bag" and "watermelon" issues

-- Soap (Såpe) - Fixed URL
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80'
WHERE category = 'Såpe' OR name ILIKE '%såpe%';

-- Comb Honey (Tavlehonning) - Fixed URL
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?w=800&q=80'
WHERE category = 'Tavlehonning' OR name ILIKE '%tavle%';

-- Heather Honey (Lynghonning) - Distinct darker honey image
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1589739900266-4399f579d5bf?w=800&q=80'
WHERE name ILIKE '%lyng%' OR name ILIKE '%heather%';
