-- Idempotent demo data for /dashboard/college/applications
-- Prefer: npm run seed:college-applications-demo (dynamic per tenant)
-- Or:    npm run db:exec-sql-file -- db/seeds/college_applications_demo.sql

-- Placement drive applications (per college tenant: students × drives)
INSERT INTO applications (student_id, drive_id, job_id, status, current_round, applied_at, notes)
SELECT
  sp.id,
  d.id,
  d.job_id,
  (ARRAY['applied', 'shortlisted', 'in_progress', 'selected', 'rejected'])[
    1 + (ROW_NUMBER() OVER (PARTITION BY sp.tenant_id ORDER BY sp.roll_number, d.id))::int % 5
  ],
  (ROW_NUMBER() OVER (PARTITION BY sp.tenant_id ORDER BY sp.roll_number, d.id))::int % 4,
  NOW() - ((ROW_NUMBER() OVER (PARTITION BY sp.tenant_id ORDER BY sp.roll_number, d.id))::int || ' days')::interval,
  'Demo seed for college Applications dashboard (safe to delete).'
FROM student_profiles sp
INNER JOIN placement_drives d
  ON d.tenant_id = sp.tenant_id
 AND d.status IN ('approved', 'scheduled', 'completed')
WHERE sp.tenant_id IN (SELECT id FROM tenants WHERE type = 'college')
  AND (NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'archived_at'
  ) OR sp.archived_at IS NULL)
ON CONFLICT (student_id, drive_id) DO UPDATE SET
  status = EXCLUDED.status,
  current_round = EXCLUDED.current_round,
  applied_at = EXCLUDED.applied_at,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Program applications (internships, jobs, projects visible to each college)
INSERT INTO program_applications (student_id, job_id, status, notes, applied_at)
SELECT
  sp.id,
  jp.id,
  (ARRAY['applied', 'shortlisted', 'in_progress', 'on_hold'])[
    1 + (ROW_NUMBER() OVER (PARTITION BY sp.tenant_id ORDER BY sp.roll_number, jp.id))::int % 4
  ],
  'Demo program application for college Applications screen.',
  NOW() - ((ROW_NUMBER() OVER (PARTITION BY sp.tenant_id ORDER BY sp.roll_number, jp.id))::int + 1 || ' days')::interval
FROM student_profiles sp
INNER JOIN job_posting_visibility jpv ON jpv.tenant_id = sp.tenant_id
INNER JOIN job_postings jp ON jp.id = jpv.job_id AND jp.status = 'published'
WHERE sp.tenant_id IN (SELECT id FROM tenants WHERE type = 'college')
  AND (NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'archived_at'
  ) OR sp.archived_at IS NULL)
ON CONFLICT (student_id, job_id) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  applied_at = EXCLUDED.applied_at,
  updated_at = NOW();
