-- Seed Franchise Documents (Manuals)
INSERT INTO franchise_documents (title, description, type, category, version, content_url, is_active)
VALUES 
(
    'Kapittel 1: Velkommen til LEK',
    'Introduksjon til LEK-Biens Vokter konseptet, visjon og verdier.',
    'manual',
    'driftsmanual',
    '1.0',
    NULL, -- Placeholder for now
    true
),
(
    'Kapittel 2: Oppstart av Enhet',
    'Sjekkliste for oppstart, utstyrsoversikt og første steg.',
    'manual',
    'driftsmanual',
    '1.0',
    NULL,
    true
),
(
    'Kapittel 3: Salg og Kundehåndtering',
    'Beste praksis for salg, kundeoppfølging og merkevarebygging.',
    'manual',
    'driftsmanual',
    '1.0',
    NULL,
    true
),
(
    'Kapittel 4: Produktkunnskap',
    'Dybdekunnskap om honning, biprodukter og kvalitetssikring.',
    'manual',
    'driftsmanual',
    '1.0',
    NULL,
    true
),
(
    'Kapittel 5: Rapportering og Økonomi',
    'Hvordan levere ukentlige rapporter og holde orden på regnskapet.',
    'manual',
    'driftsmanual',
    '1.0',
    NULL,
    true
);

-- Seed Agreement Templates (Placeholders)
INSERT INTO franchise_documents (title, description, type, category, version, content_url, is_active)
VALUES 
(
    'Lisensavtale Mal 2024',
    'Standard lisensavtale for nye franchisetakere.',
    'agreement',
    'license',
    '2024.1',
    NULL,
    true
),
(
    'Aksjonæravtale Mal',
    'Standard aksjonæravtale for medeiere.',
    'agreement',
    'shareholder',
    '1.0',
    NULL,
    true
);
