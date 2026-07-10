-- Approve tie-ups between EVERY employer and IIT Madras (Indian Institute of Technology, Madras).
-- Safe to re-run (upsert). Default before guided tests when employers show no approved campus.

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
  AND (
    t.slug = 'iit-madras'
    OR t.id = 'a1000000-0000-0000-0000-000000000001'::uuid
    OR t.name ILIKE '%Indian Institute of Technology, Madras%'
  )
ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
  status = 'approved',
  approved_at = COALESCE(employer_approvals.approved_at, NOW()),
  rejection_reason = NULL,
  approved_by = COALESCE(
    employer_approvals.approved_by,
    (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
  );
