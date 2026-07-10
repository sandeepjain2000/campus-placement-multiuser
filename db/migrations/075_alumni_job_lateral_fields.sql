-- Lateral / experienced-hire fields for alumni job postings.

BEGIN;

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS min_experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS max_experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS seniority_level VARCHAR(40),
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(40);

-- PPO is a campus fresher construct; not used for alumni lateral jobs.
UPDATE job_postings
SET is_deleted = true, updated_at = NOW()
WHERE job_type = 'ppo'
  AND COALESCE(is_deleted, false) = false;

COMMIT;
