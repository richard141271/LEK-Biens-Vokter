-- SQL for å endre minimumsantall fra 20kg til 1kg
-- Kjør dette i Supabase SQL Editor

-- 1. Endre sjekk for honey_listings tabellen
ALTER TABLE honey_listings DROP CONSTRAINT IF EXISTS honey_listings_amount_kg_check;
ALTER TABLE honey_listings ADD CONSTRAINT honey_listings_amount_kg_check CHECK (amount_kg >= 1);

-- 2. Endre sjekk for honey_transactions tabellen
ALTER TABLE honey_transactions DROP CONSTRAINT IF EXISTS honey_transactions_amount_kg_check;
ALTER TABLE honey_transactions ADD CONSTRAINT honey_transactions_amount_kg_check CHECK (amount_kg >= 1);

-- Bekreftelse
SELECT 'Constraints updated to allow 1kg minimum' as status;
