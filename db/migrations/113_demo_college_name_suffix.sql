-- Suffix "(Demo)" on seed / demo college tenant names so they are easy to
-- distinguish from real registration campuses in admin lists and hubs.
-- Idempotent: skips names that already end with " (Demo)".

BEGIN;

UPDATE tenants
SET
  name = name || ' (Demo)',
  updated_at = NOW()
WHERE type = 'college'
  AND slug IN (
    'iit-madras',
    'nit-trichy',
    'bits-pilani',
    'jadavpur-university',
    'vit-vellore',
    'dtu-delhi',
    'iiit-hyderabad'
  )
  AND name !~* '\(Demo\)\s*$';

COMMIT;
