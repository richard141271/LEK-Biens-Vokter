-- Update Tavlehonning (Hel tavle) description and price
-- Updated frame price to 40,- and clarified weight variation logic

UPDATE products 
SET 
    price = 490,
    description = 'Hel tavle med honning. Vekt varierer fra 1,2 til 2,5 kg. Pris er 450,- pr kg + 40,- for rammen. Endelig pris beregnes nøyaktig etter veiing før utsending.'
WHERE name = 'Tavlehonning (Hel tavle)';
