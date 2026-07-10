-- Scenario matrix extension seed
-- Run AFTER db/seed.sql to cover edge-case and lifecycle states.

-- 1) Employer approvals: add blacklisted scenario
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, rejection_reason, created_at)
VALUES
('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'blacklisted', 'b1000000-0000-0000-0000-000000000012', NOW() - INTERVAL '14 days', 'Policy violation in previous cycle', NOW() - INTERVAL '16 days')
ON CONFLICT (tenant_id, employer_id) DO UPDATE
SET status = EXCLUDED.status,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    rejection_reason = EXCLUDED.rejection_reason;

-- 2) Placement drive lifecycle: in_progress + cancelled
INSERT INTO placement_drives (
  id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
  start_time, end_time, venue, status, max_students, registered_count
) VALUES
(
  'e1000000-0000-0000-0000-000000000120',
  'a1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'TechCorp Live Interview Day',
  'Same-day rounds are currently in progress.',
  'on_campus',
  CURRENT_DATE,
  '09:00',
  '18:00',
  'Placement Hall B',
  'in_progress',
  120,
  67
),
(
  'e1000000-0000-0000-0000-000000000121',
  'a1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000003',
  'GlobalSoft Special Drive (Cancelled)',
  'Cancelled due to scheduling conflict.',
  'virtual',
  CURRENT_DATE + INTERVAL '12 days',
  '10:00',
  '16:00',
  'Online',
  'cancelled',
  80,
  0
)
ON CONFLICT (id) DO NOTHING;

-- 3) Program applications: rejected + withdrawn + on_hold edge states
INSERT INTO program_applications (student_id, job_id, status, notes, applied_at)
VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'd1000000-0000-0000-0000-000000000002', 'rejected', 'Did not meet role-specific requirements.', NOW() - INTERVAL '9 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'ME2021001'), 'd1000000-0000-0000-0000-000000000006', 'withdrawn', 'Withdrew after accepting alternate project.', NOW() - INTERVAL '8 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021201'), 'd1000000-0000-0000-0000-000000000005', 'on_hold', 'Panel review pending.', NOW() - INTERVAL '2 days')
ON CONFLICT (student_id, job_id) DO UPDATE
SET status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- 4) Offers: revoked state (missing in base sample)
INSERT INTO offers (
  id, application_id, student_id, employer_id, drive_id, job_title, salary, joining_date, location, status, deadline
) VALUES
(
  'f1000000-0000-0000-0000-000000000901',
  NULL,
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'),
  'c1000000-0000-0000-0000-000000000002',
  NULL,
  'Platform Engineer',
  1400000,
  CURRENT_DATE + INTERVAL '45 days',
  'Pune',
  'revoked',
  NOW() + INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- 5) Shortlists: include eliminated / waitlisted / absent
INSERT INTO shortlists (application_id, round_id, status, score, feedback, evaluated_by, evaluated_at)
VALUES
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021001' LIMIT 1),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000001' AND round_number = 2 LIMIT 1),
  'waitlisted',
  64.5,
  'Borderline score; moved to waitlist.',
  'b1000000-0000-0000-0000-000000000004',
  NOW() - INTERVAL '3 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021101' LIMIT 1),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000010' AND round_number = 1 LIMIT 1),
  'eliminated',
  41.0,
  'Cutoff not met.',
  'b1000000-0000-0000-0000-000000000004',
  NOW() - INTERVAL '5 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021201' LIMIT 1),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000011' AND round_number = 1 LIMIT 1),
  'absent',
  NULL,
  'Candidate absent.',
  'b1000000-0000-0000-0000-000000000012',
  NOW() - INTERVAL '1 days'
);

-- 6) Platform feedback lifecycle: add Closed case
INSERT INTO platform_feedback (id, user_id, title, category, description, status, created_at)
VALUES
(
  'f1000000-0000-0000-0000-000000000099',
  'b1000000-0000-0000-0000-000000000008',
  'Interview timezone confusion resolved',
  'Bug Report',
  'Issue has been fixed and verified by placement office.',
  'Closed',
  NOW() - INTERVAL '1 days'
)
ON CONFLICT (id) DO NOTHING;

