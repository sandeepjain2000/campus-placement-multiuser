-- Demo/sandbox data: no scheduled dates or placement-season anchors before 2026-01-01.
-- Fixes TechCorp demo employer founded_year typo (2001) and stale historical drives.

UPDATE employer_profiles
SET founded_year = 2010
WHERE company_slug = 'techcorp' AND (founded_year IS NULL OR founded_year < 2010 OR founded_year = 2001);

UPDATE student_profiles
SET
  batch_year = 2022,
  graduation_year = 2026
WHERE batch_year IS NOT NULL AND batch_year < 2022;

UPDATE student_profiles
SET graduation_year = 2026
WHERE graduation_year IS NOT NULL AND graduation_year < 2026;

UPDATE student_education
SET
  start_year = GREATEST(COALESCE(start_year, 2022), 2022),
  end_year = GREATEST(COALESCE(end_year, 2026), 2026)
WHERE start_year < 2022 OR end_year < 2026;

UPDATE student_projects
SET
  start_date = GREATEST(start_date, DATE '2026-01-01'),
  end_date = CASE
    WHEN end_date IS NULL THEN NULL
    ELSE GREATEST(end_date, DATE '2026-01-01')
  END
WHERE start_date < DATE '2026-01-01' OR (end_date IS NOT NULL AND end_date < DATE '2026-01-01');

UPDATE placement_drives
SET drive_date = DATE '2026-09-15'
WHERE drive_date IS NOT NULL AND drive_date < DATE '2026-01-01';

UPDATE drive_rounds
SET scheduled_date = GREATEST(scheduled_date, DATE '2026-01-01')
WHERE scheduled_date IS NOT NULL AND scheduled_date < DATE '2026-01-01';

UPDATE college_calendar
SET
  start_date = GREATEST(start_date, DATE '2026-01-01'),
  end_date = GREATEST(end_date, DATE '2026-01-01')
WHERE start_date < DATE '2026-01-01' OR end_date < DATE '2026-01-01';

UPDATE offers
SET joining_date = GREATEST(joining_date, DATE '2026-01-01')
WHERE joining_date IS NOT NULL AND joining_date < DATE '2026-01-01';

UPDATE job_postings
SET batch_year = 2026
WHERE batch_year IS NOT NULL AND batch_year < 2026;

-- Academic calendar periods (migration 051): drop pre-2026 years
DELETE FROM tenant_academic_year_semesters s
USING tenant_academic_years y
WHERE s.academic_year_id = y.id AND s.period_end < DATE '2026-01-01';

DELETE FROM tenant_academic_years
WHERE period_end < DATE '2026-01-01';

UPDATE tenant_academic_years
SET period_start = DATE '2026-01-01'
WHERE label = '2025-26' AND period_start < DATE '2026-01-01';

UPDATE tenant_academic_year_semesters s
SET
  period_start = DATE '2026-01-01',
  period_end = GREATEST(s.period_end, DATE '2026-06-30')
FROM tenant_academic_years y
WHERE s.academic_year_id = y.id
  AND y.label = '2025-26'
  AND s.sequence_number = 2
  AND s.period_start < DATE '2026-01-01';

UPDATE tenant_academic_year_semesters s
SET period_start = DATE '2026-01-01'
FROM tenant_academic_years y
WHERE s.academic_year_id = y.id
  AND y.label = '2025-26'
  AND s.sequence_number = 1
  AND s.period_start < DATE '2026-01-01';
