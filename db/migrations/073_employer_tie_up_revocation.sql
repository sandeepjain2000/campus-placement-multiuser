-- Reversible campus–employer tie-up revocation (soft flag; no data deletion).
-- Adds explicit `revoked` status and audit columns; migrates legacy blacklisted rows.

ALTER TABLE employer_approvals
  ADD COLUMN IF NOT EXISTS status_before_revoke VARCHAR(20),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revoked_by_role VARCHAR(20);

ALTER TABLE employer_approvals DROP CONSTRAINT IF EXISTS employer_approvals_status_check;
ALTER TABLE employer_approvals ADD CONSTRAINT employer_approvals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'blacklisted', 'revoked'));

-- Partnerships ended by college (blacklisted) → revoked
UPDATE employer_approvals
SET
  status = 'revoked',
  status_before_revoke = COALESCE(status_before_revoke, 'approved'),
  revoked_at = COALESCE(revoked_at, approved_at, NOW()),
  revoked_by_role = COALESCE(revoked_by_role, 'college_admin')
WHERE status = 'blacklisted';

-- Employer-cancelled approved partnerships (stored as rejected) → revoked
UPDATE employer_approvals
SET
  status = 'revoked',
  status_before_revoke = COALESCE(status_before_revoke, 'approved'),
  revoked_at = COALESCE(revoked_at, approved_at, NOW()),
  revoked_by_role = COALESCE(revoked_by_role, 'employer')
WHERE status = 'rejected' AND approved_at IS NOT NULL;
