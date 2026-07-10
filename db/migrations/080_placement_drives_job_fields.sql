-- Copy campus job posting fields onto placement drives (drives no longer link to job_postings).

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS job_type VARCHAR(30)
    CHECK (job_type IS NULL OR job_type IN ('full_time', 'internship', 'contract', 'ppo')),
  ADD COLUMN IF NOT EXISTS salary_min DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS salary_max DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS eligible_branches TEXT[],
  ADD COLUMN IF NOT EXISTS max_backlogs INTEGER,
  ADD COLUMN IF NOT EXISTS batch_year INTEGER,
  ADD COLUMN IF NOT EXISTS skills_required TEXT[],
  ADD COLUMN IF NOT EXISTS additional_info TEXT,
  ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS min_tenth_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS min_twelfth_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS bond_duration_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bond_penalty DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS locations TEXT[],
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS perks TEXT[];

COMMENT ON COLUMN placement_drives.job_type IS 'Campus role type (full_time, internship, contract, ppo).';
COMMENT ON COLUMN placement_drives.salary_min IS 'Public CTC/stipend band lower bound shown to students.';
COMMENT ON COLUMN placement_drives.salary_max IS 'Public CTC/stipend band upper bound shown to students.';

-- Backfill from linked job postings where drive fields are still empty.
UPDATE placement_drives d
SET
  job_type = COALESCE(d.job_type, j.job_type),
  description = CASE WHEN COALESCE(TRIM(d.description), '') = '' THEN j.description ELSE d.description END,
  salary_min = COALESCE(d.salary_min, j.salary_min),
  salary_max = COALESCE(d.salary_max, j.salary_max),
  salary_currency = COALESCE(d.salary_currency, j.salary_currency, 'INR'),
  eligible_branches = COALESCE(d.eligible_branches, j.eligible_branches),
  min_cgpa = COALESCE(d.min_cgpa, j.min_cgpa),
  max_backlogs = COALESCE(d.max_backlogs, j.max_backlogs),
  batch_year = COALESCE(d.batch_year, j.batch_year),
  skills_required = COALESCE(d.skills_required, j.skills_required),
  additional_info = COALESCE(d.additional_info, j.additional_info),
  application_deadline = COALESCE(d.application_deadline, j.application_deadline),
  min_tenth_pct = COALESCE(d.min_tenth_pct, j.min_tenth_pct),
  min_twelfth_pct = COALESCE(d.min_twelfth_pct, j.min_twelfth_pct),
  bond_duration_months = COALESCE(d.bond_duration_months, j.bond_duration_months),
  bond_penalty = COALESCE(d.bond_penalty, j.bond_penalty),
  locations = COALESCE(d.locations, j.locations),
  category = COALESCE(d.category, j.category),
  perks = COALESCE(d.perks, j.perks),
  max_students = COALESCE(NULLIF(d.max_students, 0), j.vacancies, d.max_students)
FROM job_postings j
WHERE d.job_id = j.id
  AND d.job_id IS NOT NULL;
