-- Hiring result column (replaces round columns in product UI/CSV).
-- Assessment context tracks draft vs submitted per employer + campus + opportunity target.

ALTER TABLE employer_assessment_rows
  ADD COLUMN IF NOT EXISTS hiring_result TEXT;

CREATE TABLE IF NOT EXISTS employer_assessment_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_kind TEXT NOT NULL CHECK (opportunity_kind IN ('internship', 'jobs', 'drive', 'projects')),
  drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted')),
  submitted_at TIMESTAMP,
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (
    (drive_id IS NOT NULL AND job_id IS NULL)
    OR (job_id IS NOT NULL AND drive_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_context_drive
  ON employer_assessment_contexts (employer_id, tenant_id, opportunity_kind, drive_id)
  WHERE drive_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_context_job
  ON employer_assessment_contexts (employer_id, tenant_id, opportunity_kind, job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_contexts_employer
  ON employer_assessment_contexts (employer_id, tenant_id, opportunity_kind);

CREATE TABLE IF NOT EXISTS employer_assessment_import_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_kind TEXT NOT NULL CHECK (opportunity_kind IN ('internship', 'jobs', 'drive', 'projects')),
  drive_id UUID REFERENCES placement_drives(id) ON DELETE SET NULL,
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'committed', 'rejected')),
  original_file_name TEXT,
  s3_key TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  committed_at TIMESTAMP,
  rejected_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_import_sessions_employer
  ON employer_assessment_import_sessions (employer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS employer_assessment_import_staging_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES employer_assessment_import_sessions(id) ON DELETE CASCADE,
  row_num INTEGER NOT NULL,
  system_id TEXT,
  college_roll_no TEXT,
  placement_drive_id TEXT,
  job_id TEXT,
  tenant_id TEXT,
  candidate_name TEXT,
  hiring_result TEXT,
  remarks TEXT,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (session_id, row_num)
);

CREATE INDEX IF NOT EXISTS idx_assessment_import_staging_session
  ON employer_assessment_import_staging_rows (session_id);
