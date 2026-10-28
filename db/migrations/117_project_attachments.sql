-- Migration 117: project_attachments
-- Stores PDF / image files attached to a job_posting (project / hackathon).
-- Additive only — no existing rows or columns are touched.

CREATE TABLE IF NOT EXISTS project_attachments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_posting_id   UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  employer_id      UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  file_url         TEXT NOT NULL,
  s3_key           TEXT NOT NULL,
  original_filename TEXT NOT NULL DEFAULT '',
  content_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes  BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_job_posting_id ON project_attachments(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_employer_id    ON project_attachments(employer_id);
