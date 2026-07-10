-- Batch = joining academic year on the student record (e.g. 2022-23, 2025-26).

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS joining_academic_year VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_student_profiles_joining_ay
  ON student_profiles (tenant_id, joining_academic_year);

COMMENT ON COLUMN student_profiles.joining_academic_year IS
  'Academic year when the student joined the institute (batch / cohort).';

UPDATE student_profiles sp
SET joining_academic_year = COALESCE(
  NULLIF(TRIM(sp.joining_academic_year), ''),
  NULLIF(TRIM(sp.aux_profile->>'joiningAcademicYear'), ''),
  NULLIF(TRIM(sp.aux_profile->>'batchLabel'), ''),
  CASE
    WHEN sp.batch_year IS NOT NULL THEN sp.batch_year::text
    ELSE NULL
  END
)
WHERE joining_academic_year IS NULL OR TRIM(joining_academic_year) = '';
