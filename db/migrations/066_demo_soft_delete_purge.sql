-- Sandbox demo purge: soft-delete flags + audit log (not hard delete).

CREATE TABLE IF NOT EXISTS demo_purge_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT true,
  cascade_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_purge_transactions_entity
  ON demo_purge_transactions (entity_type, entity_id, created_at DESC);

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE placement_drives ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE program_applications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE employer_assessment_uploads ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_job_postings_not_deleted ON job_postings (id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_placement_drives_not_deleted ON placement_drives (id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_applications_not_deleted ON applications (drive_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_program_applications_not_deleted ON program_applications (job_id) WHERE is_deleted = false;
