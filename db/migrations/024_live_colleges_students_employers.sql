-- Live (non–demo-screen) accounts: additional colleges, students, and named employers.
-- Password for every user row below: Admin@123
-- bcrypt: $2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82
--
-- Colleges here are additive to seed.sql (IIT Madras, NIT Trichy, BITS Pilani).
-- Edit tenant names/slugs if you need a different set.

BEGIN;

-- ---------------------------------------------------------------------------
-- Tenants (colleges)
-- ---------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, type, city, state, email, accreditation, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000004', 'Jadavpur University', 'jadavpur-university', 'college', 'Kolkata', 'West Bengal', 'placement@jadavpur.seed', 'UGC', true),
  ('a1000000-0000-0000-0000-000000000005', 'Vellore Institute of Technology', 'vit-vellore', 'college', 'Vellore', 'Tamil Nadu', 'placement@vit.seed', 'NAAC', true),
  ('a1000000-0000-0000-0000-000000000006', 'Delhi Technological University', 'dtu-delhi', 'college', 'New Delhi', 'Delhi', 'placement@dtu.seed', 'UGC', true),
  ('a1000000-0000-0000-0000-000000000007', 'Indian Institute of Information Technology Hyderabad', 'iiit-hyderabad', 'college', 'Hyderabad', 'Telangana', 'placement@iiith.seed', 'MoE', true)
ON CONFLICT (id) DO NOTHING;

-- Campus binding tokens (deterministic hex; one per tenant)
INSERT INTO shard_binding_pairs (ref_scope_id, surface_token)
SELECT t.id, md5('campus-live-binding-' || t.id::text) || md5('campus-live-binding-' || t.id::text || '-salt')
FROM tenants t
WHERE t.id IN (
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007'
)
ON CONFLICT (ref_scope_id) DO NOTHING;

INSERT INTO college_settings (tenant_id, max_offers_per_student, offer_acceptance_window_days, min_cgpa_threshold, placement_season_start, placement_season_end)
VALUES
  ('a1000000-0000-0000-0000-000000000004', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000005', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000006', 2, 7, 6.5, '2026-08-01', '2027-05-31'),
  ('a1000000-0000-0000-0000-000000000007', 2, 7, 6.5, '2026-08-01', '2027-05-31')
ON CONFLICT (tenant_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- College admins — email local part is admin.<college-key>
-- ---------------------------------------------------------------------------
INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
  ('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000004', 'admin.jadavpur@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
  ('b1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000005', 'admin.vit@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
  ('b1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000006', 'admin.dtu@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
  ('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000007', 'admin.iiith@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true)
ON CONFLICT (id) DO NOTHING;

-- Placement committee (read-only student data) — one per live demo college
INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
  ('b1000000-0000-0000-0000-000000000046', 'a1000000-0000-0000-0000-000000000004', 'committee.jadavpur@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
  ('b1000000-0000-0000-0000-000000000047', 'a1000000-0000-0000-0000-000000000005', 'committee.vit@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
  ('b1000000-0000-0000-0000-000000000048', 'a1000000-0000-0000-0000-000000000006', 'committee.dtu@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
  ('b1000000-0000-0000-0000-000000000049', 'a1000000-0000-0000-0000-000000000007', 'committee.iiith@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Students (3 per college) — email firstname.lastname.<college-key>@campus-placement.work
-- ---------------------------------------------------------------------------
INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
  ('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000004', 'rimjhim.bose.ju@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Rimjhim', 'Bose', true, true),
  ('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000004', 'subhajit.mukherjee.ju@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Subhajit', 'Mukherjee', true, true),
  ('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000004', 'priyanka.das.ju@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Priyanka', 'Das', true, true),
  ('b1000000-0000-0000-0000-000000000033', 'a1000000-0000-0000-0000-000000000005', 'harish.venkatesan.vit@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Harish', 'Venkatesan', true, true),
  ('b1000000-0000-0000-0000-000000000034', 'a1000000-0000-0000-0000-000000000005', 'divya.subramanian.vit@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Divya', 'Subramanian', true, true),
  ('b1000000-0000-0000-0000-000000000035', 'a1000000-0000-0000-0000-000000000005', 'nithya.krishnamoorthy.vit@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Nithya', 'Krishnamoorthy', true, true),
  ('b1000000-0000-0000-0000-000000000036', 'a1000000-0000-0000-0000-000000000006', 'zoya.siddiqui.dtu@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Zoya', 'Siddiqui', true, true),
  ('b1000000-0000-0000-0000-000000000037', 'a1000000-0000-0000-0000-000000000006', 'kabir.ahuja.dtu@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Kabir', 'Ahuja', true, true),
  ('b1000000-0000-0000-0000-000000000038', 'a1000000-0000-0000-0000-000000000006', 'simran.kaur.dtu@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Simran', 'Kaur', true, true),
  ('b1000000-0000-0000-0000-000000000039', 'a1000000-0000-0000-0000-000000000007', 'vivaan.rao.iiith@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Vivaan', 'Rao', true, true),
  ('b1000000-0000-0000-0000-000000000040', 'a1000000-0000-0000-0000-000000000007', 'kavya.sriram.iiith@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Kavya', 'Sriram', true, true),
  ('b1000000-0000-0000-0000-000000000041', 'a1000000-0000-0000-0000-000000000007', 'dhruv.malhotra.iiith@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Dhruv', 'Malhotra', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_profiles (user_id, tenant_id, roll_number, department, branch, batch_year, graduation_year, cgpa, tenth_percentage, twelfth_percentage, gender, placement_status, is_verified, bio) VALUES
  ('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000004', 'JU2021CS001', 'Computer Science & Engineering', 'Computer Science & Engineering', 2026, 2026, 8.40, 92.0, 90.0, 'female', 'unplaced', true, 'Rimjhim Bose — final-year CSE, Jadavpur University. Interested in backend systems and distributed computing.'),
  ('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000004', 'JU2021CS002', 'Computer Science & Engineering', 'Computer Science & Engineering', 2026, 2026, 7.85, 89.0, 87.5, 'male', 'unplaced', true, 'Subhajit Mukherjee — final-year CSE, Jadavpur University. Competitive programming and algorithms.'),
  ('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000004', 'JU2021EC001', 'Electronics & Telecommunication', 'Electronics & Telecommunication Engineering', 2026, 2026, 8.10, 91.0, 88.0, 'female', 'unplaced', true, 'Priyanka Das — final-year ETCE, Jadavpur University. Signal processing and embedded interest.'),
  ('b1000000-0000-0000-0000-000000000033', 'a1000000-0000-0000-0000-000000000005', 'VIT2021CS101', 'Computer Science & Engineering', 'Computer Science & Engineering', 2026, 2026, 8.65, 93.0, 91.0, 'male', 'unplaced', true, 'Harish Venkatesan — final-year CSE, VIT Vellore. Full-stack and cloud deployments.'),
  ('b1000000-0000-0000-0000-000000000034', 'a1000000-0000-0000-0000-000000000005', 'VIT2021CS102', 'Computer Science & Engineering', 'Computer Science & Engineering', 2026, 2026, 9.05, 95.0, 93.0, 'female', 'unplaced', true, 'Divya Subramanian — final-year CSE, VIT Vellore. ML and data engineering.'),
  ('b1000000-0000-0000-0000-000000000035', 'a1000000-0000-0000-0000-000000000005', 'VIT2021IT101', 'Information Technology', 'Information Technology', 2026, 2026, 8.20, 90.0, 89.0, 'female', 'unplaced', true, 'Nithya Krishnamoorthy — final-year IT, VIT Vellore. Security and DevOps.'),
  ('b1000000-0000-0000-0000-000000000036', 'a1000000-0000-0000-0000-000000000006', 'DTU2021CO001', 'Computer Engineering', 'Computer Engineering', 2026, 2026, 8.55, 92.5, 91.0, 'female', 'unplaced', true, 'Zoya Siddiqui — final-year COE, DTU. Systems programming and OS.'),
  ('b1000000-0000-0000-0000-000000000037', 'a1000000-0000-0000-0000-000000000006', 'DTU2021CO002', 'Computer Engineering', 'Computer Engineering', 2026, 2026, 7.95, 88.0, 86.0, 'male', 'unplaced', true, 'Kabir Ahuja — final-year COE, DTU. Mobile and product engineering.'),
  ('b1000000-0000-0000-0000-000000000038', 'a1000000-0000-0000-0000-000000000006', 'DTU2021SE001', 'Software Engineering', 'Software Engineering', 2026, 2026, 8.75, 94.0, 92.0, 'female', 'unplaced', true, 'Simran Kaur — final-year Software Engineering, DTU. Platform engineering and SRE.'),
  ('b1000000-0000-0000-0000-000000000039', 'a1000000-0000-0000-0000-000000000007', 'IIITH2021CSE001', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 9.10, 96.0, 94.0, 'male', 'unplaced', true, 'Vivaan Rao — final-year CSE, IIIT Hyderabad. Research interest in NLP and HCI.'),
  ('b1000000-0000-0000-0000-000000000040', 'a1000000-0000-0000-0000-000000000007', 'IIITH2021CSE002', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 8.90, 95.0, 93.5, 'female', 'unplaced', true, 'Kavya Sriram — final-year CSE, IIIT Hyderabad. Computer vision and robotics.'),
  ('b1000000-0000-0000-0000-000000000041', 'a1000000-0000-0000-0000-000000000007', 'IIITH2021CSD001', 'Computational Linguistics', 'Dual Degree CSE', 2026, 2026, 8.35, 93.0, 91.0, 'male', 'unplaced', true, 'Dhruv Malhotra — dual-degree CSE, IIIT Hyderabad. CL and speech tech.')
ON CONFLICT (user_id) DO NOTHING;

UPDATE student_profiles
SET aux_profile = COALESCE(aux_profile, '{}'::jsonb) || jsonb_build_object('degreePursued', 'B.Tech')
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000030'::uuid,
  'b1000000-0000-0000-0000-000000000031'::uuid,
  'b1000000-0000-0000-0000-000000000032'::uuid,
  'b1000000-0000-0000-0000-000000000033'::uuid,
  'b1000000-0000-0000-0000-000000000034'::uuid,
  'b1000000-0000-0000-0000-000000000035'::uuid,
  'b1000000-0000-0000-0000-000000000036'::uuid,
  'b1000000-0000-0000-0000-000000000037'::uuid,
  'b1000000-0000-0000-0000-000000000038'::uuid,
  'b1000000-0000-0000-0000-000000000039'::uuid,
  'b1000000-0000-0000-0000-000000000040'::uuid,
  'b1000000-0000-0000-0000-000000000041'::uuid
);

UPDATE student_profiles
SET branch = COALESCE(NULLIF(TRIM(branch), ''), NULLIF(TRIM(department), ''))
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000030'::uuid,
  'b1000000-0000-0000-0000-000000000031'::uuid,
  'b1000000-0000-0000-0000-000000000032'::uuid,
  'b1000000-0000-0000-0000-000000000033'::uuid,
  'b1000000-0000-0000-0000-000000000034'::uuid,
  'b1000000-0000-0000-0000-000000000035'::uuid,
  'b1000000-0000-0000-0000-000000000036'::uuid,
  'b1000000-0000-0000-0000-000000000037'::uuid,
  'b1000000-0000-0000-0000-000000000038'::uuid,
  'b1000000-0000-0000-0000-000000000039'::uuid,
  'b1000000-0000-0000-0000-000000000040'::uuid,
  'b1000000-0000-0000-0000-000000000041'::uuid
)
AND NULLIF(TRIM(branch), '') IS NULL;

-- ---------------------------------------------------------------------------
-- Employers (login = hr.<slug>@campus-placement.work)
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
  ('b1000000-0000-0000-0000-000000000050', 'hr.tcs@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'TCS', 'Talent', true, true),
  ('b1000000-0000-0000-0000-000000000051', 'hr.quess@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Quess', 'HR', true, true),
  ('b1000000-0000-0000-0000-000000000052', 'hr.accenture@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Accenture', 'Recruiting', true, true),
  ('b1000000-0000-0000-0000-000000000053', 'hr.amazon@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Amazon', 'Talent', true, true),
  ('b1000000-0000-0000-0000-000000000054', 'hr.wipro@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Wipro', 'Talent', true, true),
  ('b1000000-0000-0000-0000-000000000055', 'hr.edgeverve@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'EdgeVerve', 'Talent', true, true),
  ('b1000000-0000-0000-0000-000000000056', 'hr.panaya@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Panaya', 'Talent', true, true),
  ('b1000000-0000-0000-0000-000000000057', 'hr.droga5@campus-placement.work', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Droga5', 'Talent', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employer_profiles (id, user_id, company_name, company_slug, industry, company_type, company_size, website, description, headquarters, locations) VALUES
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000050', 'Tata Consultancy Services (TCS)', 'tcs', 'Global IT Services', 'mnc', '600000+', 'https://techcorp.com/', 'AI, cloud modernization, digital engineering. Global IT services at scale.', 'Mumbai, India', ARRAY['Mumbai', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad']),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000051', 'Quess Corp', 'quess-corp', 'Technology-enabled staffing', 'private', 'Not disclosed', 'https://techcorp.com/', 'Technology-enabled staffing; expansion of HR-tech providers.', 'Bangalore, India', ARRAY['Bangalore', 'Mumbai', 'Delhi NCR']),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000052', 'Accenture', 'accenture', 'Engineering, Information Technology, Business Development', 'mnc', 'Not disclosed', 'https://techcorp.com/', 'Management consulting and technology services.', 'Dublin, Ireland', ARRAY['Bangalore', 'Mumbai', 'Hyderabad', 'Pune']),
  ('c1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000053', 'Amazon', 'amazon', 'Engineering, Operations, Sales', 'mnc', 'Not disclosed', 'https://techcorp.com/', 'Cloud computing, e-commerce, and operations at scale.', 'Seattle, USA', ARRAY['Bangalore', 'Hyderabad', 'Chennai', 'Mumbai']),
  ('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000054', 'Wipro', 'wipro', 'IT services, consulting', 'mnc', 'Not disclosed', 'https://techcorp.com/', 'IT services and consulting; broad service expansion.', 'Bangalore, India', ARRAY['Bangalore', 'Hyderabad', 'Pune', 'Chennai']),
  ('c1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000055', 'EdgeVerve', 'edgeverve', 'Information Technology', 'mnc', 'Not disclosed', 'https://techcorp.com/', 'Software development and product engineering (Infosys subsidiary).', 'Bangalore, India', ARRAY['Bangalore', 'Mumbai']),
  ('c1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000056', 'Panaya', 'panaya', 'Information Technology', 'private', 'Not disclosed', 'https://techcorp.com/', 'Software development and maintenance for enterprise change intelligence.', 'Hackensack, USA', ARRAY['Bangalore', 'Tel Aviv']),
  ('c1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000057', 'Droga5', 'droga5', 'Engineering, Information Technology', 'private', 'Not disclosed', 'https://techcorp.com/', 'Creative agency with engineering and technology capabilities (Accenture Song).', 'New York, USA', ARRAY['New York', 'London', 'Tokyo'])
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Credential summary (password for all rows: Admin@123)
-- ---------------------------------------------------------------------------
-- | Login (email)                              | Password  | Entity |
-- |--------------------------------------------|-----------|--------|
-- | admin.jadavpur@campus-placement.work       | Admin@123 | Jadavpur University |
-- | admin.vit@campus-placement.work            | Admin@123 | Vellore Institute of Technology |
-- | admin.dtu@campus-placement.work            | Admin@123 | Delhi Technological University |
-- | admin.iiith@campus-placement.work          | Admin@123 | IIIT Hyderabad |
-- | rimjhim.bose.ju@campus-placement.work      | Admin@123 | Rimjhim Bose (Jadavpur) |
-- | subhajit.mukherjee.ju@campus-placement.work | Admin@123 | Subhajit Mukherjee (Jadavpur) |
-- | priyanka.das.ju@campus-placement.work      | Admin@123 | Priyanka Das (Jadavpur) |
-- | harish.venkatesan.vit@campus-placement.work | Admin@123 | Harish Venkatesan (VIT) |
-- | divya.subramanian.vit@campus-placement.work | Admin@123 | Divya Subramanian (VIT) |
-- | nithya.krishnamoorthy.vit@campus-placement.work | Admin@123 | Nithya Krishnamoorthy (VIT) |
-- | zoya.siddiqui.dtu@campus-placement.work     | Admin@123 | Zoya Siddiqui (DTU) |
-- | kabir.ahuja.dtu@campus-placement.work       | Admin@123 | Kabir Ahuja (DTU) |
-- | simran.kaur.dtu@campus-placement.work       | Admin@123 | Simran Kaur (DTU) |
-- | vivaan.rao.iiith@campus-placement.work      | Admin@123 | Vivaan Rao (IIIT Hyderabad) |
-- | kavya.sriram.iiith@campus-placement.work    | Admin@123 | Kavya Sriram (IIIT Hyderabad) |
-- | dhruv.malhotra.iiith@campus-placement.work  | Admin@123 | Dhruv Malhotra (IIIT Hyderabad) |
-- | hr.tcs@campus-placement.work               | Admin@123 | Tata Consultancy Services (TCS) |
-- | hr.quess@campus-placement.work             | Admin@123 | Quess Corp |
-- | hr.accenture@campus-placement.work         | Admin@123 | Accenture |
-- | hr.amazon@campus-placement.work            | Admin@123 | Amazon |
-- | hr.wipro@campus-placement.work             | Admin@123 | Wipro |
-- | hr.edgeverve@campus-placement.work         | Admin@123 | EdgeVerve |
-- | hr.panaya@campus-placement.work            | Admin@123 | Panaya |
-- | hr.droga5@campus-placement.work            | Admin@123 | Droga5 |
