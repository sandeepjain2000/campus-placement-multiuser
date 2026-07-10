-- Placement committee: read-only college staff for student data (per-tenant).

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'college_admin', 'placement_committee', 'employer', 'student'));

-- Demo placement committee accounts (per college tenant)
UPDATE users
SET role = 'placement_committee',
    first_name = 'Placement',
    last_name = 'Committee',
    updated_at = NOW()
WHERE email IN ('committee@iitm.edu', 'committee@nitt.edu', 'committee@bits.edu');

INSERT INTO users (
  tenant_id, email, communication_email, password_hash, role,
  first_name, last_name, is_active, is_verified, email_verified_at
)
SELECT
  v.tenant_id,
  v.email,
  'sandeepjain200019@gmail.com',
  '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82',
  'placement_committee',
  'Placement',
  'Committee',
  true,
  true,
  NOW()
FROM (
  VALUES
    ('a1000000-0000-0000-0000-000000000002'::uuid, 'committee@nitt.edu'),
    ('a1000000-0000-0000-0000-000000000003'::uuid, 'committee@bits.edu')
) AS v(tenant_id, email)
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = v.email);
