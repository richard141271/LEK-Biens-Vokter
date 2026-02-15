-- Feed levels via 'for' transcription
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('for lite', 'lite honning', 'HONNING', 'approved'),
  ('for middels', 'middels honning', 'HONNING', 'approved'),
  ('for mye', 'mye honning', 'HONNING', 'approved'),
  ('for bra', 'mye honning', 'HONNING', 'approved')
ON CONFLICT DO NOTHING;

-- Yngel(leie) variants to base token 'yngel'
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('yngelleie', 'yngel', 'YNGEL', 'approved'),
  ('yngle leie', 'yngel', 'YNGEL', 'approved'),
  ('ynglelei', 'yngel', 'YNGEL', 'approved'),
  ('innleie', 'yngel', 'YNGEL', 'approved')
ON CONFLICT DO NOTHING;

-- Frequent combined phrases mapped to parser-friendly forms
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('ganske dårlig yngel', 'dårlig yngel', 'YNGEL', 'approved'),
  ('mye yngel', 'bra yngel', 'YNGEL', 'approved'),
  ('yngel bra mye', 'bra yngel', 'YNGEL', 'approved'),
  ('lite yngel', 'dårlig yngel', 'YNGEL', 'approved')
ON CONFLICT DO NOTHING;
