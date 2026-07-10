-- Set batch 2026 for all active students except alumni (Priya Sharma stays 2018).
-- Align internship and placement-drive eligibility to batch 2026.

BEGIN;

-- Non-alumni students → batch 2026 (explicitly skip Priya Sharma alumni account)
UPDATE student_profiles sp
SET
  batch_year = 2026,
  joining_academic_year = '2026',
  aux_profile = COALESCE(sp.aux_profile, '{}'::jsonb)
    || jsonb_build_object('batchLabel', '2026', 'joiningAcademicYear', '2026'),
  updated_at = NOW()
WHERE COALESCE(sp.is_alumni, false) = false
  AND sp.user_id IS DISTINCT FROM 'b1000000-0000-0000-0000-000000000099'::uuid
  AND sp.batch_year IS DISTINCT FROM 2026;

-- Internships: eligible batch 2026
UPDATE job_postings
SET batch_year = 2026, updated_at = NOW()
WHERE job_type = 'internship'
  AND batch_year IS DISTINCT FROM 2026
  AND COALESCE(is_deleted, false) = false;

-- Placement drives: add batch_year if migration 080 not yet applied, then set eligibility
ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS batch_year INTEGER;

UPDATE placement_drives d
SET batch_year = 2026, updated_at = NOW()
WHERE d.batch_year IS DISTINCT FROM 2026
  AND COALESCE(d.is_deleted, false) = false;

COMMIT;
