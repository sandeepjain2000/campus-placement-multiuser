-- Alumni student flag, IIT Madras alumni demo account, and purge existing alumni job postings.

BEGIN;

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS is_alumni BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_student_profiles_is_alumni
  ON student_profiles (is_alumni)
  WHERE is_alumni = true;

-- IIT Madras alumni demo login (password: Admin@123 — same bcrypt as other seed users)
INSERT INTO users (
  id, tenant_id, email, communication_email, password_hash, role,
  first_name, last_name, email_verified_at, is_active
)
VALUES (
  'b1000000-0000-0000-0000-000000000099'::uuid,
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'priya.sharma.alumni@iitm.edu',
  'sandeepjain200019@gmail.com',
  '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82',
  'student',
  'Priya',
  'Sharma',
  NOW(),
  true
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  email = EXCLUDED.email,
  communication_email = EXCLUDED.communication_email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
  is_active = true,
  updated_at = NOW();

UPDATE users SET phone = '+919800100099', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000099'::uuid;

INSERT INTO student_profiles (
  user_id, tenant_id, roll_number, enrollment_number, department, branch,
  batch_year, graduation_year, cgpa, tenth_percentage, twelfth_percentage,
  gender, placement_status, is_verified, is_alumni, bio, resume_url
)
VALUES (
  'b1000000-0000-0000-0000-000000000099'::uuid,
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'CS2018001',
  'ENR-IITM-CS2018001',
  'Computer Science',
  'Computer Science & Engineering',
  2018,
  2022,
  8.55,
  93.0,
  90.5,
  'female',
  'unplaced',
  true,
  true,
  'IIT Madras alumnus (B.Tech CSE, 2022). Open to alumni referrals and experienced-hire roles.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
)
ON CONFLICT (user_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  roll_number = EXCLUDED.roll_number,
  enrollment_number = EXCLUDED.enrollment_number,
  department = EXCLUDED.department,
  branch = EXCLUDED.branch,
  batch_year = EXCLUDED.batch_year,
  graduation_year = EXCLUDED.graduation_year,
  cgpa = EXCLUDED.cgpa,
  is_verified = true,
  is_alumni = true,
  bio = EXCLUDED.bio,
  resume_url = EXCLUDED.resume_url,
  updated_at = NOW();

-- Soft-delete legacy alumni job postings once (safe to re-run after marker exists).
CREATE TABLE IF NOT EXISTS schema_one_time_actions (
  action_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_one_time_actions WHERE action_key = '074_alumni_job_purge') THEN
    RETURN;
  END IF;

  UPDATE program_applications pa
  SET is_deleted = true, updated_at = NOW()
  FROM job_postings jp
  WHERE pa.job_id = jp.id
    AND jp.job_type = ANY(ARRAY['full_time', 'contract', 'ppo']::text[])
    AND COALESCE(pa.is_deleted, false) = false
    AND COALESCE(jp.is_deleted, false) = false;

  UPDATE applications a
  SET is_deleted = true, updated_at = NOW()
  FROM job_postings jp
  WHERE a.job_id = jp.id
    AND jp.job_type = ANY(ARRAY['full_time', 'contract', 'ppo']::text[])
    AND COALESCE(a.is_deleted, false) = false
    AND COALESCE(jp.is_deleted, false) = false;

  UPDATE employer_assessment_uploads eau
  SET is_deleted = true
  FROM job_postings jp
  WHERE eau.job_id = jp.id
    AND jp.job_type = ANY(ARRAY['full_time', 'contract', 'ppo']::text[])
    AND COALESCE(eau.is_deleted, false) = false
    AND COALESCE(jp.is_deleted, false) = false;

  UPDATE job_postings
  SET is_deleted = true, updated_at = NOW()
  WHERE job_type = ANY(ARRAY['full_time', 'contract', 'ppo']::text[])
    AND COALESCE(is_deleted, false) = false;

  INSERT INTO schema_one_time_actions (action_key) VALUES ('074_alumni_job_purge');
END $$;

COMMIT;
