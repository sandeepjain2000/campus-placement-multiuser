-- Demo employer assessment upload for TechCorp (hr@techcorp.com) — appears under Assessment uploads → Upload history.
-- Safe to re-run: replaces the fixed demo upload id if present.

DELETE FROM employer_assessment_change_log WHERE upload_id = 'f1000000-0000-0000-0000-000000000010';
DELETE FROM employer_assessment_rows WHERE upload_id = 'f1000000-0000-0000-0000-000000000010';
DELETE FROM employer_assessment_rounds WHERE upload_id = 'f1000000-0000-0000-0000-000000000010';
DELETE FROM employer_assessment_uploads WHERE id = 'f1000000-0000-0000-0000-000000000010';

INSERT INTO employer_assessment_uploads (
  id, employer_id, tenant_id, drive_id, job_id, uploaded_by, original_file_name, s3_key,
  total_rows, accepted_rows, rejected_rows, created_at
) VALUES (
  'f1000000-0000-0000-0000-000000000010',
  'c1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  NULL,
  'b1000000-0000-0000-0000-000000000004',
  'demo-assessment-rounds.csv',
  NULL,
  3, 3, 0,
  NOW() - INTERVAL '2 days'
);

INSERT INTO employer_assessment_rounds (upload_id, round_no, round_label) VALUES
('f1000000-0000-0000-0000-000000000010', 1, 'Online Aptitude'),
('f1000000-0000-0000-0000-000000000010', 2, 'Coding'),
('f1000000-0000-0000-0000-000000000010', 3, 'Technical interview'),
('f1000000-0000-0000-0000-000000000010', 4, 'HR'),
('f1000000-0000-0000-0000-000000000010', 5, 'Manager');

INSERT INTO employer_assessment_rows (
  id, upload_id, student_profile_id, application_id, roll_number, is_unregistered_student,
  round_1_result, round_2_result, round_3_result, round_4_result, round_5_result, remarks, candidate_name
) VALUES
(
  'f1000000-0000-0000-0000-000000000021',
  'f1000000-0000-0000-0000-000000000010',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021001' LIMIT 1),
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021001' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001' LIMIT 1),
  'CS2021001',
  false,
  'Pass', 'Pass', 'Scheduled', '', '',
  'Seed data — panel notes optional',
  NULL
),
(
  'f1000000-0000-0000-0000-000000000022',
  'f1000000-0000-0000-0000-000000000010',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021002' LIMIT 1),
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021002' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001' LIMIT 1),
  'CS2021002',
  false,
  'Pass', 'Pass', 'In progress', '', '',
  NULL,
  NULL
),
(
  'f1000000-0000-0000-0000-000000000023',
  'f1000000-0000-0000-0000-000000000010',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021003' LIMIT 1),
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021003' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001' LIMIT 1),
  'CS2021003',
  false,
  'Pass', 'Pass', 'Pass', 'Pass', 'Selected',
  'Offer candidate — demo row',
  NULL
);
