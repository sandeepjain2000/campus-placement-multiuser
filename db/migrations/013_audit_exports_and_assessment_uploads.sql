-- Audit report export tracking + employer assessment uploads/results capture.

CREATE TABLE IF NOT EXISTS audit_report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  s3_key TEXT,
  emailed_to VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_report_exports_tenant ON audit_report_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_report_exports_status ON audit_report_exports(status);
CREATE INDEX IF NOT EXISTS idx_audit_report_exports_created_at ON audit_report_exports(created_at DESC);

CREATE TABLE IF NOT EXISTS employer_assessment_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  drive_id UUID REFERENCES placement_drives(id) ON DELETE SET NULL,
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  original_file_name VARCHAR(255) NOT NULL,
  s3_key TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  accepted_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK ((drive_id IS NOT NULL AND job_id IS NULL) OR (drive_id IS NULL AND job_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_assessment_uploads_employer ON employer_assessment_uploads(employer_id);
CREATE INDEX IF NOT EXISTS idx_assessment_uploads_tenant ON employer_assessment_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessment_uploads_drive ON employer_assessment_uploads(drive_id);
CREATE INDEX IF NOT EXISTS idx_assessment_uploads_job ON employer_assessment_uploads(job_id);

CREATE TABLE IF NOT EXISTS employer_assessment_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES employer_assessment_uploads(id) ON DELETE CASCADE,
  round_no INTEGER NOT NULL CHECK (round_no BETWEEN 1 AND 5),
  round_label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(upload_id, round_no)
);

CREATE TABLE IF NOT EXISTS employer_assessment_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES employer_assessment_uploads(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  roll_number VARCHAR(50) NOT NULL,
  is_unregistered_student BOOLEAN NOT NULL DEFAULT false,
  round_1_result TEXT,
  round_2_result TEXT,
  round_3_result TEXT,
  round_4_result TEXT,
  round_5_result TEXT,
  remarks VARCHAR(4000),
  candidate_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(upload_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_rows_upload ON employer_assessment_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_assessment_rows_student ON employer_assessment_rows(student_profile_id);
