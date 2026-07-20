-- Ensure Placement Committee demo accounts for Jadavpur, VIT, DTU, and IIIT-H exist.
-- These were originally added in 024 but get wiped when db/seed.sql is re-run
-- (seed only recreated IITM / NITT / BITS). Password for all: Admin@123
-- User IDs 050–057 avoid collisions with employer/student seed rows (020–023).

BEGIN;

INSERT INTO tenants (id, name, slug, type, city, state, email, communication_email, accreditation, is_active)
VALUES
  ('a1000000-0000-0000-0000-000000000004', 'Jadavpur University (Demo)', 'jadavpur-university', 'college', 'Kolkata', 'West Bengal', 'placement@jadavpur.seed', 'sandeepjain200019@gmail.com', 'UGC', true),
  ('a1000000-0000-0000-0000-000000000005', 'Vellore Institute of Technology (Demo)', 'vit-vellore', 'college', 'Vellore', 'Tamil Nadu', 'placement@vit.seed', 'sandeepjain200019@gmail.com', 'NAAC', true),
  ('a1000000-0000-0000-0000-000000000006', 'Delhi Technological University (Demo)', 'dtu-delhi', 'college', 'New Delhi', 'Delhi', 'placement@dtu.seed', 'sandeepjain200019@gmail.com', 'UGC', true),
  ('a1000000-0000-0000-0000-000000000007', 'Indian Institute of Information Technology Hyderabad (Demo)', 'iiit-hyderabad', 'college', 'Hyderabad', 'Telangana', 'placement@iiith.seed', 'sandeepjain200019@gmail.com', 'MoE', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = 'college',
  is_active = true,
  updated_at = NOW();

INSERT INTO shard_binding_pairs (ref_scope_id, surface_token)
SELECT t.id, md5('campus-live-binding-' || t.id::text) || md5('campus-live-binding-' || t.id::text || '-salt')
FROM tenants t
WHERE t.id IN (
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007'
)
ON CONFLICT (ref_scope_id) DO NOTHING;

INSERT INTO college_settings (tenant_id, max_offers_per_student, offer_acceptance_window_days, min_cgpa_threshold, placement_season_start, placement_season_end)
VALUES
  ('a1000000-0000-0000-0000-000000000004', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000005', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000006', 2, 7, 6.5, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000007', 2, 7, 6.5, '2026-08-01', '2027-05-31')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO users (
  id, tenant_id, email, communication_email, password_hash, role,
  first_name, last_name, is_active, is_verified, email_verified_at
)
VALUES
  ('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000004', 'admin.jadavpur@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000051', 'a1000000-0000-0000-0000-000000000005', 'admin.vit@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000052', 'a1000000-0000-0000-0000-000000000006', 'admin.dtu@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000053', 'a1000000-0000-0000-0000-000000000007', 'admin.iiith@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000054', 'a1000000-0000-0000-0000-000000000004', 'committee.jadavpur@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000055', 'a1000000-0000-0000-0000-000000000005', 'committee.vit@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000056', 'a1000000-0000-0000-0000-000000000006', 'committee.dtu@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true, NOW()),
  ('b1000000-0000-0000-0000-000000000057', 'a1000000-0000-0000-0000-000000000007', 'committee.iiith@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true, NOW())
ON CONFLICT (email) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = true,
  is_verified = true,
  communication_email = COALESCE(users.communication_email, EXCLUDED.communication_email),
  email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
  updated_at = NOW();

COMMIT;
