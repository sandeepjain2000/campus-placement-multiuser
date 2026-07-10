-- Distinguish the registration duplicate from seed IIT Madras (same display name).
UPDATE tenants
SET
  name = 'Test Indian Institute of Technology, Madras',
  updated_at = NOW()
WHERE id = 'c093f0c0-e29c-4f1f-9669-31bab7a04d80'
  AND LOWER(TRIM(name)) = LOWER('Indian Institute of Technology, Madras');
