-- Soft-archive students (mistaken or test entries) without deleting history.
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_student_profiles_archived
  ON student_profiles (tenant_id, archived_at)
  WHERE archived_at IS NOT NULL;
