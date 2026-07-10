-- One placement_committee user per college tenant (read-only student data).
-- Derives committee email from the college admin login (admin@x.edu → committee@x.edu, admin.foo@… → committee.foo@…).

UPDATE users
SET role = 'placement_committee',
    first_name = 'Placement',
    last_name = 'Committee',
    updated_at = NOW()
WHERE email IN (
  'committee@iitm.edu',
  'committee@nitt.edu',
  'committee@bits.edu',
  'committee.jadavpur@campus-placement.work',
  'committee.vit@campus-placement.work',
  'committee.dtu@campus-placement.work',
  'committee.iiith@campus-placement.work'
);

INSERT INTO users (
  tenant_id,
  email,
  communication_email,
  password_hash,
  role,
  first_name,
  last_name,
  is_active,
  is_verified,
  email_verified_at
)
SELECT
  picked.tenant_id,
  picked.committee_email,
  COALESCE(picked.communication_email, 'sandeepjain200019@gmail.com'),
  '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82',
  'placement_committee',
  'Placement',
  'Committee',
  true,
  true,
  NOW()
FROM (
  SELECT DISTINCT ON (ca.tenant_id)
    ca.tenant_id,
    ca.communication_email,
    CASE
      WHEN ca.email LIKE 'admin@%' THEN 'committee' || substring(ca.email FROM position('@' IN ca.email))
      WHEN ca.email LIKE 'admin.%@%' THEN 'committee.' || substring(ca.email FROM 7)
      ELSE 'committee+' || replace(ca.tenant_id::text, '-', '') || '@campus-placement.work'
    END AS committee_email
  FROM users ca
  INNER JOIN tenants t ON t.id = ca.tenant_id AND t.type = 'college'
  WHERE ca.role = 'college_admin'
    AND ca.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM users pc
      WHERE pc.tenant_id = ca.tenant_id
        AND pc.role = 'placement_committee'
        AND pc.is_active = true
    )
  ORDER BY ca.tenant_id, ca.email
) AS picked
ON CONFLICT (email) DO UPDATE SET
  role = 'placement_committee',
  tenant_id = EXCLUDED.tenant_id,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  is_verified = true,
  email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
  updated_at = NOW();
