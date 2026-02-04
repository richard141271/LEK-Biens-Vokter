-- Fix duplicate ambitions and add unique constraint

-- 1. Delete duplicates, keeping the most recently updated one
DELETE FROM founder_ambitions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY founder_id ORDER BY updated_at DESC) as r_num
    FROM founder_ambitions
  ) t
  WHERE t.r_num > 1
);

-- 2. Add unique constraint to founder_id
ALTER TABLE founder_ambitions ADD CONSTRAINT founder_ambitions_founder_id_key UNIQUE (founder_id);
