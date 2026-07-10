-- Approve tie-ups between EVERY employer and EVERY active college tenant.
-- Safe to re-run (upsert). For IIT Madras only (default testing), use ensure_iitm_employer_partnerships.sql

INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
SELECT
  t.id,
  ep.id,
  'approved',
  NOW(),
  NOW()
FROM tenants t
CROSS JOIN employer_profiles ep
WHERE t.is_active = true
  AND t.type = 'college'
ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
  status = 'approved',
  approved_at = COALESCE(employer_approvals.approved_at, NOW()),
  rejection_reason = NULL,
  approved_by = COALESCE(
    employer_approvals.approved_by,
    (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
  );
