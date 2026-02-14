-- Seed safe, high-signal alias pairs derived from ordtrening rapport 2026-02-14
-- These reduce common STT confusions without changing domain semantics
-- Approve directly to benefit all users

-- Weather
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES 
  ('overskya', 'overskyet', 'VÆR', 'approved')
ON CONFLICT DO NOTHING;

-- Status actions
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('svømming', 'sverming', 'STATUS', 'approved'),
  ('skifte rammer', 'skiftet rammer', 'STATUS', 'approved'),
  ('mottatt for', 'mottatt fôr', 'STATUS', 'approved'),
  ('byttet boks', 'byttet voks', 'STATUS', 'approved'),
  ('vox', 'voks', 'STATUS', 'approved')
ON CONFLICT DO NOTHING;

-- Varroa variants
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('vara mistanke', 'varroa mistanke', 'SYKDOM', 'approved'),
  ('var han mistanke', 'varroa mistanke', 'SYKDOM', 'approved'),
  ('bare var mistanke', 'varroa mistanke', 'SYKDOM', 'approved')
ON CONFLICT DO NOTHING;

-- Eggs
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('egseth', 'egg sett', 'EGG', 'approved'),
  ('eggset', 'egg sett', 'EGG', 'approved'),
  ('eggsatt', 'egg sett', 'EGG', 'approved'),
  ('engeset', 'egg sett', 'EGG', 'approved')
ON CONFLICT DO NOTHING;

-- Queen
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('dronning søt', 'dronning sett', 'DRONNING', 'approved'),
  ('dronnings', 'dronning sett', 'DRONNING', 'approved')
ON CONFLICT DO NOTHING;

-- Honey/Brood friendly additions kept in alias bank, not parser
-- 'bra inger' etc. collapse to 'bra yngel' — leave moderated in alias flow

-- Temperature: normalize degree symbol to 'grader'
INSERT INTO voice_aliases (alias, correct_phrase, category, status)
VALUES
  ('°', 'grader', 'TEMPERATUR', 'approved'),
  ('º', 'grader', 'TEMPERATUR', 'approved')
ON CONFLICT DO NOTHING;
