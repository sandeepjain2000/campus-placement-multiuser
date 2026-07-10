-- Per-upload audit trail for employer assessment CSV uploads and post-upload edits.
-- Also written to audit_logs (tenant-scoped) so college Audit Reports can surface activity.

CREATE TABLE IF NOT EXISTS employer_assessment_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES employer_assessment_uploads(id) ON DELETE CASCADE,
  row_id UUID REFERENCES employer_assessment_rows(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_assessment_change_upload
  ON employer_assessment_change_log(upload_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employer_assessment_change_actor
  ON employer_assessment_change_log(actor_user_id);
