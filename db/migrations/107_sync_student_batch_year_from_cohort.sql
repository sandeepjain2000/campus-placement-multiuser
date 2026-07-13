-- Align batch_year with joining_academic_year / aux batch label when they disagree.
-- Fixes eligibility using stale batch_year while profile shows cohort year (e.g. Arjun Verma).

BEGIN;

UPDATE student_profiles sp
SET
  batch_year = cohort.cohort_year,
  updated_at = NOW()
FROM (
  SELECT
    id,
    (
      REGEXP_MATCH(
        COALESCE(
          NULLIF(TRIM(joining_academic_year), ''),
          NULLIF(TRIM(aux_profile->>'joiningAcademicYear'), ''),
          NULLIF(TRIM(aux_profile->>'batchLabel'), '')
        ),
        '^(\d{4})'
      )
    )[1]::integer AS cohort_year
  FROM student_profiles
) cohort
WHERE sp.id = cohort.id
  AND cohort.cohort_year IS NOT NULL
  AND sp.batch_year IS DISTINCT FROM cohort.cohort_year;

COMMIT;
