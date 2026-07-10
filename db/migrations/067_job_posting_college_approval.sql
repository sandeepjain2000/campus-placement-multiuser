-- Per-campus college approval before students see published job/program listings.

ALTER TABLE job_posting_visibility
  ADD COLUMN IF NOT EXISTS college_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (college_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_job_visibility_college_status
  ON job_posting_visibility (tenant_id, college_status);

-- Existing visibility rows stay visible to students (grandfather).
UPDATE job_posting_visibility
SET college_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE college_status = 'pending';
