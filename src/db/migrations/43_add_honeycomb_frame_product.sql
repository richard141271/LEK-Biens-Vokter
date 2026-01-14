-- Add new product: Tavlehonning (Hel tavle)
-- Price is calculated as 450,- (approx 1kg) + 30,- for the frame = 480,-

INSERT INTO products (name, description, price, category, image_url, stock, is_active)
VALUES (
    'Tavlehonning (Hel tavle)',
    'Hel tavle med honning. Pris er basert på ca 1 kg (450,-/kg) + ramme (30,-). Endelig pris justeres etter vekt.',
    480,
    'Honning',
    '/BILDER/D6B86142-B83B-4592-8B1C-73396E595DE2.png',
    5,
    true
);
