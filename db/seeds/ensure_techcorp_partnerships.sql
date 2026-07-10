-- Ensure TechCorp (hr@techcorp.com) has approved tie-ups with all active colleges.
-- Safe to re-run (upsert). Use before guided internship playbook if campuses show empty.

INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
SELECT
  t.id,
  ep.id,
  'approved',
  NOW(),
  NOW()
FROM tenants t
CROSS JOIN employer_profiles ep
INNER JOIN users u ON u.id = ep.user_id
WHERE u.email = 'hr@techcorp.com'
  AND t.is_active = true
  AND t.type = 'college'
ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
  status = 'approved',
  approved_at = COALESCE(employer_approvals.approved_at, NOW()),
  rejection_reason = NULL,
  approved_by = COALESCE(
    employer_approvals.approved_by,
    (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
  );
