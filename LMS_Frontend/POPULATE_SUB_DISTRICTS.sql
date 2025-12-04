-- Populate sub-districts for each district
-- This script assumes districts already exist with their codes

-- Addis Ababa sub-districts
INSERT INTO sub_districts (district_id, name, is_active)
SELECT id, unnest(ARRAY[
  'Arada',
  'Bole',
  'Kirkos',
  'Kolfe Keranio',
  'Gullele',
  'Lideta',
  'Nifas Silk-Lafto',
  'Addis Ketema',
  'Akaky Kaliti',
  'Yeka'
]), true
FROM districts
WHERE LOWER(name) = 'addis ababa'
ON CONFLICT DO NOTHING;

-- Dire Dawa sub-districts
INSERT INTO sub_districts (district_id, name, is_active)
SELECT id, unnest(ARRAY[
  'Addis Ketema',
  'Akaky Kaliti',
  'Arada',
  'Bole',
  'Gullele',
  'Kirkos',
  'Kolfe Keranio',
  'Lideta',
  'Nifas Silk-Lafto',
  'Yeka'
]), true
FROM districts
WHERE LOWER(name) = 'dire dawa'
ON CONFLICT DO NOTHING;

-- Hargeisa sub-districts
INSERT INTO sub_districts (district_id, name, is_active)
SELECT id, unnest(ARRAY[
  '26 June',
  'Ibrahim Koodbuur'
]), true
FROM districts
WHERE LOWER(name) = 'hargeisa'
ON CONFLICT DO NOTHING;

-- Jigjiga sub-districts
INSERT INTO sub_districts (district_id, name, is_active)
SELECT id, unnest(ARRAY[
  'Awbare',
  'Babile',
  'Goljano',
  'Gursum',
  'Harawo',
  'Haroorays',
  'Harshin',
  'Jijiga (rural woreda)',
  'Kebri Beyah special woreda',
  'Qooraan (headquarters in Mulla)',
  'Shabeeley',
  'Tuli Guled',
  'Wajale special woreda'
]), true
FROM districts
WHERE LOWER(name) = 'jigjiga'
ON CONFLICT DO NOTHING;
