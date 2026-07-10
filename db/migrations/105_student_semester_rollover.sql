-- Student semester tracking and May–Jun rollover audit trail.

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS semester_number INTEGER,
  ADD COLUMN IF NOT EXISTS program_duration_years INTEGER NOT NULL DEFAULT 4;

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_semester_number_chk
  CHECK (semester_number IS NULL OR (semester_number >= 1 AND semester_number <= 24));

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_program_duration_years_chk
  CHECK (program_duration_years >= 1 AND program_duration_years <= 8);

CREATE INDEX IF NOT EXISTS idx_student_profiles_semester
  ON student_profiles (tenant_id, semester_number);

COMMENT ON COLUMN student_profiles.semester_number IS
  'Cumulative program semester (1..duration*semesters/year). Updated by May–Jun rollover.';

COMMENT ON COLUMN student_profiles.program_duration_years IS
  'Program length in years (default 4 for B.Tech). Used for semester cap.';

CREATE TABLE IF NOT EXISTS tenant_semester_rollover_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  academic_year_label VARCHAR(16) NOT NULL,
  semester_in_year INTEGER NOT NULL CHECK (semester_in_year BETWEEN 1 AND 3),
  as_of_date DATE NOT NULL,
  students_scanned INTEGER NOT NULL DEFAULT 0,
  students_updated INTEGER NOT NULL DEFAULT 0,
  triggered_by VARCHAR(40) NOT NULL DEFAULT 'manual',
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_semester_rollover_tenant
  ON tenant_semester_rollover_runs (tenant_id, created_at DESC);

-- Backfill semester_number from aux_profile.semester where possible.
UPDATE student_profiles sp
SET semester_number = LEAST(
  GREATEST(NULLIF(TRIM(sp.aux_profile->>'semester'), '')::int, 1),
  COALESCE(sp.program_duration_years, 4) * 2
)
WHERE sp.semester_number IS NULL
  AND sp.aux_profile->>'semester' ~ '^\d+$';
