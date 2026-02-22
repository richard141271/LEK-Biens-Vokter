ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS core_apiary_id TEXT;

ALTER TABLE hives
ADD COLUMN IF NOT EXISTS core_hive_id TEXT;

ALTER TABLE lek_core.apiaries
ADD COLUMN IF NOT EXISTS local_apiary_id UUID;

ALTER TABLE lek_core.hives
ADD COLUMN IF NOT EXISTS local_hive_id UUID;

UPDATE apiaries a
SET core_apiary_id = c.apiary_id::text
FROM lek_core.apiaries c
WHERE c.local_apiary_id IS NOT NULL
  AND c.local_apiary_id = a.id
  AND a.core_apiary_id IS NULL;

WITH to_insert AS (
  SELECT a.id AS local_apiary_id, b.beekeeper_id, a.name
  FROM apiaries a
  JOIN lek_core.beekeepers b
    ON b.auth_user_id = a.user_id
  WHERE a.core_apiary_id IS NULL
),
inserted AS (
  INSERT INTO lek_core.apiaries (beekeeper_id, name, local_apiary_id)
  SELECT beekeeper_id, name, local_apiary_id
  FROM to_insert
  RETURNING apiary_id, local_apiary_id
)
UPDATE apiaries a
SET core_apiary_id = i.apiary_id::text
FROM inserted i
WHERE a.id = i.local_apiary_id
  AND a.core_apiary_id IS NULL;

UPDATE hives h
SET core_hive_id = c.hive_id::text
FROM lek_core.hives c
WHERE c.local_hive_id IS NOT NULL
  AND c.local_hive_id = h.id
  AND h.core_hive_id IS NULL;

WITH to_insert_hives AS (
  SELECT h.id AS local_hive_id, a.core_apiary_id
  FROM hives h
  JOIN apiaries a ON a.id = h.apiary_id
  WHERE h.core_hive_id IS NULL
    AND a.core_apiary_id IS NOT NULL
),
inserted_hives AS (
  INSERT INTO lek_core.hives (apiary_id, local_hive_id)
  SELECT core_apiary_id::uuid, local_hive_id
  FROM to_insert_hives
  RETURNING hive_id, local_hive_id
)
UPDATE hives h
SET core_hive_id = i.hive_id::text
FROM inserted_hives i
WHERE h.id = i.local_hive_id
  AND h.core_hive_id IS NULL;

