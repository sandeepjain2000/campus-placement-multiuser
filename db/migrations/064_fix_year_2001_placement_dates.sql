-- Repair dates stored as year 2001 due to String(Date).slice(0,10) display/save bug.
-- Shifts calendar month/day unchanged: 2001-MM-DD → 2026-MM-DD (+25 years).
-- Does NOT change student date_of_birth or employer founded_year (handled elsewhere).

-- Placement drives & rounds
UPDATE placement_drives
SET drive_date = drive_date + INTERVAL '25 years',
    updated_at = NOW()
WHERE drive_date IS NOT NULL
  AND EXTRACT(YEAR FROM drive_date) = 2001;

UPDATE drive_rounds
SET scheduled_date = scheduled_date + INTERVAL '25 years'
WHERE scheduled_date IS NOT NULL
  AND EXTRACT(YEAR FROM scheduled_date) = 2001;

-- College calendar (interview slots, drives, exams, etc.)
UPDATE college_calendar
SET start_date = start_date + INTERVAL '25 years'
WHERE EXTRACT(YEAR FROM start_date) = 2001;

UPDATE college_calendar
SET end_date = end_date + INTERVAL '25 years'
WHERE end_date IS NOT NULL
  AND EXTRACT(YEAR FROM end_date) = 2001;

-- Offers
UPDATE offers
SET joining_date = joining_date + INTERVAL '25 years',
    updated_at = NOW()
WHERE joining_date IS NOT NULL
  AND EXTRACT(YEAR FROM joining_date) = 2001;

UPDATE offers
SET deadline = deadline + INTERVAL '25 years',
    updated_at = NOW()
WHERE deadline IS NOT NULL
  AND EXTRACT(YEAR FROM deadline) = 2001;

-- Job application deadlines tied to drives/programs
UPDATE job_postings
SET application_deadline = application_deadline + INTERVAL '25 years',
    updated_at = NOW()
WHERE application_deadline IS NOT NULL
  AND EXTRACT(YEAR FROM application_deadline) = 2001;

-- College placement season anchors
UPDATE college_settings
SET placement_season_start = placement_season_start + INTERVAL '25 years',
    updated_at = NOW()
WHERE placement_season_start IS NOT NULL
  AND EXTRACT(YEAR FROM placement_season_start) = 2001;

UPDATE college_settings
SET placement_season_end = placement_season_end + INTERVAL '25 years',
    updated_at = NOW()
WHERE placement_season_end IS NOT NULL
  AND EXTRACT(YEAR FROM placement_season_end) = 2001;

-- Academic year periods (if any were written as 2001)
UPDATE tenant_academic_years
SET period_start = period_start + INTERVAL '25 years',
    period_end = period_end + INTERVAL '25 years'
WHERE EXTRACT(YEAR FROM period_start) = 2001
   OR EXTRACT(YEAR FROM period_end) = 2001;

UPDATE tenant_academic_year_semesters s
SET
  period_start = s.period_start + INTERVAL '25 years',
  period_end = s.period_end + INTERVAL '25 years'
WHERE EXTRACT(YEAR FROM s.period_start) = 2001
   OR EXTRACT(YEAR FROM s.period_end) = 2001;

-- Student projects (portfolio dates corrupted by the same bug pattern)
UPDATE student_projects
SET start_date = start_date + INTERVAL '25 years'
WHERE start_date IS NOT NULL
  AND EXTRACT(YEAR FROM start_date) = 2001;

UPDATE student_projects
SET end_date = end_date + INTERVAL '25 years'
WHERE end_date IS NOT NULL
  AND EXTRACT(YEAR FROM end_date) = 2001;

-- Employer interview plans stored in tenants.settings JSON (not in college_calendar yet)
UPDATE tenants t
SET settings = jsonb_set(
  COALESCE(t.settings, '{}'::jsonb),
  '{employerInterviewPlans}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'date') ~ '^2001-[0-9]{2}-[0-9]{2}$' THEN
            jsonb_set(elem, '{date}', to_jsonb('2026' || substring(elem->>'date' from 5))::jsonb, true)
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(t.settings->'employerInterviewPlans', '[]'::jsonb))
        WITH ORDINALITY AS x(elem, ord)
    ),
    '[]'::jsonb
  ),
  true
),
updated_at = NOW()
WHERE t.settings ? 'employerInterviewPlans'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(t.settings->'employerInterviewPlans') AS e(elem)
    WHERE (elem->>'date') ~ '^2001-[0-9]{2}-[0-9]{2}$'
  );
