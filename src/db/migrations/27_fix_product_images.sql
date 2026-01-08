-- Update existing products with correct images based on their category or name
-- Summer Honey
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80'
WHERE name ILIKE '%sommerhonning%' OR name ILIKE '%summer%';

-- Heather Honey
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=800&q=80'
WHERE name ILIKE '%lynghonning%' OR name ILIKE '%heather%';

-- Soap (already correct, but ensuring consistency)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80'
WHERE category ILIKE '%såpe%' OR name ILIKE '%såpe%';

-- Beeswax
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1605651202724-1306bf1dc80c?w=800&q=80'
WHERE category ILIKE '%bivoks%' OR name ILIKE '%bivoks%';

-- Comb Honey (Tavlehonning)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?w=800&q=80'
WHERE category ILIKE '%tavle%' OR name ILIKE '%tavle%';

-- Gift Packs
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1541530777-50580a6c6d7d?w=800&q=80'
WHERE category ILIKE '%gave%' OR name ILIKE '%gave%';
