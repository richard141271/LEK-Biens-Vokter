-- Update product images to be more specific based on category or name

-- Beeswax (Bivoks)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1626202378964-340944f3e68e?w=800&q=80'
WHERE category = 'Bivoks' OR name ILIKE '%voks%';

-- Soap (Såpe)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=800&q=80'
WHERE category = 'Såpe' OR name ILIKE '%såpe%';

-- Comb Honey (Tavlehonning)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80'
WHERE category = 'Tavlehonning' OR name ILIKE '%tavle%';

-- Gift Packs (Gavepakker)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1596450524472-888a7d2e032f?w=800&q=80'
WHERE category = 'Gavepakker' OR name ILIKE '%gave%';

-- Standard Honey (Honning) - Default fallback for 'Honning' category if not already specific
-- Only update if it's the melon image or generic placeholder
UPDATE products
SET image_url = 'https://images.unsplash.com/photo-1587049352851-8d4e8918dcb1?w=800&q=80'
WHERE category = 'Honning' AND (image_url ILIKE '%melon%' OR image_url IS NULL);
