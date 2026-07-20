-- ============================================
-- Campus Placement SaaS - Seed Data
-- ============================================
-- Logos: public/logos/seed-*.svg (served as /logos/...) — referenced from tenants.logo_url
-- and employer_profiles.logo_url so UI does not rely on name-based logo guessing.
-- Campus registration keys: shard_binding_pairs rows for IITM / NITT / BITS (64-char hex).
--   Query: SELECT surface_token FROM shard_binding_pairs WHERE ref_scope_id = '<tenant uuid>';

-- Default password for all seeded users: 'Admin@123'
-- bcrypt hash: $2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82

-- Reset existing data so this script is re-runnable in test environments.
TRUNCATE TABLE
  audit_logs,
  marketplace_orders,
  marketplace_services,
  marketplace_providers,
  employer_assessment_change_log,
  employer_assessment_rows,
  employer_assessment_rounds,
  employer_assessment_uploads,
  mail_delivery_logs,
  message_templates,
  notifications,
  clarification_questions,
  clarification_batches,
  sponsorship_donation_receipt_sends,
  sponsorship_payments,
  sponsorship_opportunities,
  startup_funding_receipt_sends,
  startup_funding_payments,
  startup_funding_opportunities,
  offers,
  shortlists,
  application_status_log,
  program_applications,
  job_posting_visibility,
  applications,
  drive_rounds,
  placement_drives,
  job_postings,
  student_education,
  student_documents,
  student_cvs,
  student_projects,
  student_skills,
  student_profiles,
  employer_approvals,
  employer_ratings,
  campus_guest_confirmation_sends,
  campus_engagement_listings,
  college_calendar,
  college_facilities,
  college_settings,
  employer_profiles,
  users,
  tenants
RESTART IDENTITY CASCADE;

-- NOTE:
-- sponsorship opportunities and clarifications are now first-class tables.
-- dedicated interview-slot table is still pending (current app uses college_calendar for slot events).

-- 1. Create Tenants (Colleges)
INSERT INTO tenants (id, name, slug, type, city, state, email, communication_email, accreditation, naac_grade, established_year) VALUES
('a1000000-0000-0000-0000-000000000001', 'Indian Institute of Technology, Madras (Demo)', 'iit-madras', 'college', 'Chennai', 'Tamil Nadu', 'placement@iitm.edu', 'sandeepjain200019@gmail.com', 'AICTE', 'A++', 1958),
('a1000000-0000-0000-0000-000000000002', 'National Institute of Technology, Trichy (Demo)', 'nit-trichy', 'college', 'Tiruchirappalli', 'Tamil Nadu', 'placement@nitt.edu', 'sandeepjain200019@gmail.com', 'AICTE', 'A+', 1964),
('a1000000-0000-0000-0000-000000000003', 'Birla Institute of Technology, Pilani (Demo)', 'bits-pilani', 'college', 'Pilani', 'Rajasthan', 'placement@bits.edu', 'sandeepjain200019@gmail.com', 'AICTE', 'A+', 1964),
('a1000000-0000-0000-0000-000000000004', 'Jadavpur University (Demo)', 'jadavpur-university', 'college', 'Kolkata', 'West Bengal', 'placement@jadavpur.seed', 'sandeepjain200019@gmail.com', 'UGC', 'A', 1955),
('a1000000-0000-0000-0000-000000000005', 'Vellore Institute of Technology (Demo)', 'vit-vellore', 'college', 'Vellore', 'Tamil Nadu', 'placement@vit.seed', 'sandeepjain200019@gmail.com', 'NAAC', 'A++', 1984),
('a1000000-0000-0000-0000-000000000006', 'Delhi Technological University (Demo)', 'dtu-delhi', 'college', 'New Delhi', 'Delhi', 'placement@dtu.seed', 'sandeepjain200019@gmail.com', 'UGC', 'A', 1941),
('a1000000-0000-0000-0000-000000000007', 'Indian Institute of Information Technology Hyderabad (Demo)', 'iiit-hyderabad', 'college', 'Hyderabad', 'Telangana', 'placement@iiith.seed', 'sandeepjain200019@gmail.com', 'MoE', 'A++', 1998);

-- 1b. College public profile + logos + settings (replaces former hard-coded EntityLogo / defaults)
UPDATE tenants SET
  website = 'https://techcorp.com/',
  logo_url = '/logos/seed-iitm.svg',
  nirf_rank = 1,
  phone = '+91-44-2257-8000',
  address = 'IIT Madras Campus, Sardar Patel Road',
  pincode = '600036',
  settings = $cfg${
    "placementSeasonLabel": "2025-26",
    "websiteApi": "",
    "placementOfficer": {
      "name": "Dr. Rajesh Kumar",
      "email": "placement@iitm.edu",
      "designation": "Training & Placement Officer"
    },
    "social": {
      "twitter": "https://twitter.com/iitmadras",
      "facebook": "https://www.facebook.com/iitmadras",
      "instagram": "https://www.instagram.com/iitmadras/",
      "linkedin": "https://www.linkedin.com/school/indian-institute-of-technology-madras/"
    },
    "institutionShowcase": {
      "nbaAccreditedPrograms": "CSE, ECE, Mechanical (Tier-1)",
      "nirfCategoryRanks": "Overall #1, Engineering #1, Innovation #2",
      "notableAlumni": "Sundar Pichai, Arvind Krishna, Kris Gopalakrishnan",
      "patentCount": 820,
      "startupCount": 310,
      "incubationCells": "IITM Incubation Cell, IITM Research Park",
      "researchCenters": "AI4Bharat, Center for NEMS, National Center for Combustion R&D"
    }
  }$cfg$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000001';

UPDATE tenants SET
  website = 'https://techcorp.com/',
  logo_url = '/logos/seed-nitt.svg',
  nirf_rank = 9,
  phone = '+91-431-250-3000',
  address = 'Tanjavur Main Road, National Highway 67',
  pincode = '620015',
  settings = $cfg${
    "placementSeasonLabel": "2025-26",
    "websiteApi": "",
    "placementOfficer": {
      "name": "Dr. Priya Sharma",
      "email": "placement@nitt.edu",
      "designation": "Training & Placement Officer"
    },
    "social": {
      "twitter": "https://twitter.com/nitttrichy",
      "facebook": "https://www.facebook.com/nitttrichy",
      "instagram": "",
      "linkedin": "https://www.linkedin.com/school/national-institute-of-technology-tiruchirappalli/"
    },
    "institutionShowcase": {
      "nbaAccreditedPrograms": "CSE, ECE, EEE, Civil, Mechanical",
      "nirfCategoryRanks": "Engineering Top-10, Architecture Top-25",
      "notableAlumni": "N. Chandrasekaran, S. Venkatachary, M. Lakshmanan",
      "patentCount": 240,
      "startupCount": 95,
      "incubationCells": "NIT Trichy Incubation & Entrepreneurship Hub",
      "researchCenters": "Energy & Environment, Robotics, Materials & Manufacturing"
    }
  }$cfg$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000002';

UPDATE tenants SET
  website = 'https://techcorp.com/',
  logo_url = '/logos/seed-bits.svg',
  nirf_rank = 25,
  phone = '+91-1596-242-192',
  address = 'Vidya Vihar, Pilani Campus',
  pincode = '333031',
  settings = $cfg${
    "placementSeasonLabel": "2025-26",
    "websiteApi": "",
    "placementOfficer": {
      "name": "Dr. Suresh Rao",
      "email": "placement@bits.edu",
      "designation": "Training & Placement Officer"
    },
    "social": {
      "twitter": "https://twitter.com/bitspilaniindia",
      "facebook": "https://www.facebook.com/bitspilani",
      "instagram": "",
      "linkedin": "https://www.linkedin.com/school/birla-institute-of-technology-and-science-pilani/"
    },
    "institutionShowcase": {
      "nbaAccreditedPrograms": "CSE, ECE, EEE, Chemical, Mechanical",
      "nirfCategoryRanks": "University Top-30, Engineering Top-30",
      "notableAlumni": "Sanjay Mehrotra, Prithviraj Chavan, Baba Kalyani",
      "patentCount": 310,
      "startupCount": 180,
      "incubationCells": "BITS BioCyTiH Foundation, Pilani Innovation & Entrepreneurship Development Society",
      "researchCenters": "Photonics, Data Science, Advanced Materials"
    }
  }$cfg$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- 1c. Campus enrollment keys (64 hex chars each) for registration demos — survives full seed when tenants are recreated.
INSERT INTO shard_binding_pairs (ref_scope_id, surface_token) VALUES
('a1000000-0000-0000-0000-000000000001', md5('seed-campus-iitm-2025') || md5('seed-campus-iitm-2025-x')),
('a1000000-0000-0000-0000-000000000002', md5('seed-campus-nitt-2025') || md5('seed-campus-nitt-2025-x')),
('a1000000-0000-0000-0000-000000000003', md5('seed-campus-bits-2025') || md5('seed-campus-bits-2025-x')),
('a1000000-0000-0000-0000-000000000004', md5('seed-campus-jadavpur-2025') || md5('seed-campus-jadavpur-2025-x')),
('a1000000-0000-0000-0000-000000000005', md5('seed-campus-vit-2025') || md5('seed-campus-vit-2025-x')),
('a1000000-0000-0000-0000-000000000006', md5('seed-campus-dtu-2025') || md5('seed-campus-dtu-2025-x')),
('a1000000-0000-0000-0000-000000000007', md5('seed-campus-iiith-2025') || md5('seed-campus-iiith-2025-x'))
ON CONFLICT (ref_scope_id) DO UPDATE SET surface_token = EXCLUDED.surface_token;

-- 2. Create Users
-- Super Admin
INSERT INTO users (id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000001', 'admin@placementhub.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'super_admin', 'Platform', 'Admin', true, true);

-- Super Admin brand mark (sidebar / topbar when using avatar pipeline)
UPDATE users SET avatar_url = '/logos/seed-placementhub.svg' WHERE id = 'b1000000-0000-0000-0000-000000000001';

-- College Admins
INSERT INTO users (id, tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'admin@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Rajesh', 'Kumar', true, true),
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'admin@nitt.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Priya', 'Sharma', true, true),
('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003', 'admin@bits.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Suresh', 'Rao', true, true),
('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001', 'committee@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000042', 'a1000000-0000-0000-0000-000000000002', 'committee@nitt.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000043', 'a1000000-0000-0000-0000-000000000003', 'committee@bits.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000004', 'admin.jadavpur@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
('b1000000-0000-0000-0000-000000000051', 'a1000000-0000-0000-0000-000000000005', 'admin.vit@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
('b1000000-0000-0000-0000-000000000052', 'a1000000-0000-0000-0000-000000000006', 'admin.dtu@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
('b1000000-0000-0000-0000-000000000053', 'a1000000-0000-0000-0000-000000000007', 'admin.iiith@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'college_admin', 'Placement', 'Office', true, true),
('b1000000-0000-0000-0000-000000000054', 'a1000000-0000-0000-0000-000000000004', 'committee.jadavpur@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000055', 'a1000000-0000-0000-0000-000000000005', 'committee.vit@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000056', 'a1000000-0000-0000-0000-000000000006', 'committee.dtu@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true),
('b1000000-0000-0000-0000-000000000057', 'a1000000-0000-0000-0000-000000000007', 'committee.iiith@campus-placement.work', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'placement_committee', 'Placement', 'Committee', true, true);

-- Employers
INSERT INTO users (id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000004', 'hr@techcorp.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Anita', 'Desai', true, true),
('b1000000-0000-0000-0000-000000000005', 'hr@globalsoft.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Vikram', 'Singh', true, true),
('b1000000-0000-0000-0000-000000000006', 'hr@infosys.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Meera', 'Nair', true, true),
('b1000000-0000-0000-0000-000000000013', 'hr@academic.nitt.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'NITT', 'Academic Affairs', true, true),
('b1000000-0000-0000-0000-000000000014', 'hr@alumni.bits.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'BITS', 'Alumni Association', true, true),
('b1000000-0000-0000-0000-000000000018', 'talent@innoventlabs.ai', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Rahul', 'Menon', true, true),
('b1000000-0000-0000-0000-000000000019', 'careers@finedge.io', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Aditi', 'Kapoor', true, true),
('b1000000-0000-0000-0000-000000000020', 'hiring@greenvolt.in', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Karan', 'Joshi', true, true),
('b1000000-0000-0000-0000-000000000021', 'jobs@dataquotient.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'Neha', 'Bansal', true, true);

-- Students (IIT Mumbai)
INSERT INTO users (id, tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'arjun.verma@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Arjun', 'Verma', true, true),
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'sneha.iyer@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Sneha', 'Iyer', true, true),
('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'rohan.patel@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Rohan', 'Patel', true, true),
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'kavya.reddy@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Kavya', 'Reddy', true, true),
('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'amit.sharma@iitm.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Amit', 'Sharma', true, true),
('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000002', 'sneha.rao@nitt.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Sneha', 'Rao', true, true),
('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000002', 'vikram.nair@nitt.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Vikram', 'Nair', true, true),
('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003', 'rohan.mehta@bits.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Rohan', 'Mehta', true, true);

-- Demo student mobiles (profile completion + realistic contact)
UPDATE users SET phone = x.p FROM (VALUES
  ('b1000000-0000-0000-0000-000000000007'::uuid, '+919800100001'),
  ('b1000000-0000-0000-0000-000000000008'::uuid, '+919800100002'),
  ('b1000000-0000-0000-0000-000000000009'::uuid, '+919800100003'),
  ('b1000000-0000-0000-0000-000000000010'::uuid, '+919800100004'),
  ('b1000000-0000-0000-0000-000000000011'::uuid, '+919800100005'),
  ('b1000000-0000-0000-0000-000000000015'::uuid, '+919800100015'),
  ('b1000000-0000-0000-0000-000000000024'::uuid, '+919800100024'),
  ('b1000000-0000-0000-0000-000000000016'::uuid, '+919800100016')
) AS x(id, p) WHERE users.id = x.id;

-- 3. College Settings
INSERT INTO college_settings (tenant_id, max_offers_per_student, offer_acceptance_window_days, min_cgpa_threshold, placement_season_start, placement_season_end) VALUES
('a1000000-0000-0000-0000-000000000001', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000002', 1, 5, 6.5, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000003', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000004', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000005', 2, 7, 6.0, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000006', 2, 7, 6.5, '2026-08-01', '2027-05-31'),
('a1000000-0000-0000-0000-000000000007', 2, 7, 6.5, '2026-08-01', '2027-05-31');

-- Sponsorship remittance details (used on employer sponsorship checkout + college view)
UPDATE college_settings SET
  sponsorship_cheque_payable_to = 'The Registrar, Indian Institute of Technology Madras',
  sponsorship_bank_account_name = 'IIT Madras Training & Placement Sponsorship',
  sponsorship_bank_name = 'Indian Bank',
  sponsorship_bank_account_number = '6789123456789',
  sponsorship_bank_ifsc = 'IDIB000IITM',
  sponsorship_bank_branch = 'IIT Madras Campus Branch, Chennai'
WHERE tenant_id = 'a1000000-0000-0000-0000-000000000001';

UPDATE college_settings SET
  sponsorship_cheque_payable_to = 'The Registrar, National Institute of Technology Tiruchirappalli',
  sponsorship_bank_account_name = 'NIT Trichy Placement & Industry Relations',
  sponsorship_bank_name = 'Canara Bank',
  sponsorship_bank_account_number = '11223344556677',
  sponsorship_bank_ifsc = 'CNRB0001234',
  sponsorship_bank_branch = 'NIT Campus, Tiruchirappalli'
WHERE tenant_id = 'a1000000-0000-0000-0000-000000000002';

UPDATE college_settings SET
  sponsorship_cheque_payable_to = 'The Registrar, Birla Institute of Technology and Science Pilani',
  sponsorship_bank_account_name = 'BITS Pilani Training & Placement Sponsorship Account',
  sponsorship_bank_name = 'State Bank of India',
  sponsorship_bank_account_number = '3889012345678',
  sponsorship_bank_ifsc = 'SBIN0007082',
  sponsorship_bank_branch = 'SBI Vidya Vihar, Pilani, Rajasthan'
WHERE tenant_id = 'a1000000-0000-0000-0000-000000000003';

-- 4. Employer Profiles (logo_url seeds — used by auth + employer profile UI; not name-guessed)
INSERT INTO employer_profiles (id, user_id, company_name, company_slug, industry, company_type, company_size, founded_year, website, logo_url, description, headquarters, locations) VALUES
('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'TechCorp Solutions', 'techcorp', 'Information Technology', 'mnc', '10000+', 2010, 'https://techcorp.com/', '/logos/seed-techcorp.svg', 'Leading global technology solutions provider specializing in AI, cloud computing, and enterprise software.', 'Bangalore, India', ARRAY['Bangalore', 'Hyderabad', 'Mumbai', 'Pune']),
('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 'GlobalSoft Technologies', 'globalsoft', 'Information Technology', 'mnc', '5000-10000', 1998, 'https://techcorp.com/', '/logos/seed-globalsoft.svg', 'Enterprise software development and consulting company with operations in 20+ countries.', 'Pune, India', ARRAY['Pune', 'Chennai', 'Noida']),
('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'Infosys Limited', 'infosys', 'Information Technology', 'mnc', '10000+', 1981, 'https://techcorp.com/', '/logos/seed-infosys.svg', 'Global leader in next-generation digital services and consulting.', 'Bangalore, India', ARRAY['Bangalore', 'Mysuru', 'Pune', 'Hyderabad', 'Chennai']),
('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000013', 'NIT Trichy Academic Affairs', 'nitt-academic', 'Education', 'government', '1000-5000', 1964, 'https://techcorp.com/', '/logos/seed-nitt.svg', 'Academic hiring and guest faculty management for NIT Trichy.', 'Trichy, India', ARRAY['Trichy']),
('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000014', 'BITS Alumni Association', 'bits-alumni', 'Education', 'ngo', '10000+', 1978, 'https://techcorp.com/', '/logos/seed-bits.svg', 'Connecting current students with established alumni for mentorship and guidance.', 'Pilani, India', ARRAY['Pilani']),
('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000018', 'Innovent Labs', 'innovent-labs', 'Artificial Intelligence', 'startup', '500-1000', 2016, 'https://techcorp.com/', '/logos/seed-innovent.svg', 'AI products company building enterprise copilots and automation assistants.', 'Bengaluru, India', ARRAY['Bengaluru', 'Hyderabad']),
('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000019', 'FinEdge Systems', 'finedge-systems', 'FinTech', 'private', '1000-5000', 2012, 'https://techcorp.com/', '/logos/seed-finedge.svg', 'FinTech platform focused on payments infra, fraud prevention, and risk scoring.', 'Mumbai, India', ARRAY['Mumbai', 'Pune', 'Gurugram']),
('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000020', 'GreenVolt Mobility', 'greenvolt-mobility', 'EV & Mobility', 'startup', '200-500', 2019, 'https://techcorp.com/', '/logos/seed-greenvolt.svg', 'Electric mobility startup focused on battery systems, fleet analytics, and charging software.', 'Chennai, India', ARRAY['Chennai', 'Bengaluru']),
('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000021', 'DataQuotient Analytics', 'dataquotient-analytics', 'Data Analytics', 'private', '500-1000', 2015, 'https://techcorp.com/', '/logos/seed-dataquotient.svg', 'Advanced analytics and decision intelligence consulting with strong campus hiring programs.', 'Hyderabad, India', ARRAY['Hyderabad', 'Noida', 'Pune']);

-- 4b. Employer campus approvals: none in seed — employers request tie-ups from the app.

-- 5. Student Profiles (enrollment_number + resume_url keep dashboard / profile flows healthy in demos)
INSERT INTO student_profiles (user_id, tenant_id, roll_number, enrollment_number, department, branch, batch_year, graduation_year, cgpa, tenth_percentage, twelfth_percentage, gender, placement_status, is_verified, bio, resume_url) VALUES
('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'CS2021001', 'ENR-IITM-CS2021001', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 8.72, 94.5, 91.2, 'male', 'unplaced', true, 'Passionate about AI/ML and full-stack development. Looking for challenging opportunities in technology.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'CS2021002', 'ENR-IITM-CS2021002', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 9.15, 96.0, 93.8, 'female', 'unplaced', true, 'Interested in data science, NLP, and backend engineering. Active contributor to open-source.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'EC2021001', 'ENR-IITM-EC2021001', 'Electronics', 'Electronics & Communication', 2026, 2026, 7.65, 88.0, 85.5, 'male', 'unplaced', true, 'Experienced in embedded systems and IoT. Strong fundamentals in signal processing.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'CS2021003', 'ENR-IITM-CS2021003', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 8.45, 92.0, 89.0, 'female', 'placed', true, 'Full-stack developer with experience in React, Node.js, and Python. Placed at TechCorp.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'ME2021001', 'ENR-IITM-ME2021001', 'Mechanical', 'Mechanical Engineering', 2026, 2026, 7.20, 85.0, 82.0, 'male', 'unplaced', true, 'Interested in product design and manufacturing automation.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000002', 'CS2021101', 'ENR-NITT-CS2021101', 'Computer Science', 'Computer Science & Engineering', 2026, 2026, 8.90, 95.0, 92.5, 'female', 'unplaced', true, 'Full stack developer with passion for building scalable web applications.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000002', 'EE2021102', 'ENR-NITT-EE2021102', 'Electrical', 'Electrical & Electronics Engineering', 2026, 2026, 8.10, 91.0, 88.0, 'male', 'unplaced', true, 'Power systems and embedded control interests.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003', 'CS2021201', 'ENR-BITS-CS2021201', 'Computer Science', 'Computer Science & Engineering', 2026, 2029, 9.20, 98.0, 96.0, 'male', 'unplaced', true, 'AI/ML enthusiast. Working on deep learning applications and research.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

-- Degree = B.Tech; department/branch hold stream names (specialisation).
UPDATE student_profiles
SET aux_profile = COALESCE(aux_profile, '{}'::jsonb) || jsonb_build_object('degreePursued', 'B.Tech')
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000007'::uuid,
  'b1000000-0000-0000-0000-000000000008'::uuid,
  'b1000000-0000-0000-0000-000000000009'::uuid,
  'b1000000-0000-0000-0000-000000000010'::uuid,
  'b1000000-0000-0000-0000-000000000011'::uuid,
  'b1000000-0000-0000-0000-000000000015'::uuid,
  'b1000000-0000-0000-0000-000000000024'::uuid,
  'b1000000-0000-0000-0000-000000000016'::uuid
);

UPDATE student_profiles
SET branch = COALESCE(NULLIF(TRIM(branch), ''), NULLIF(TRIM(department), ''))
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000007'::uuid,
  'b1000000-0000-0000-0000-000000000008'::uuid,
  'b1000000-0000-0000-0000-000000000009'::uuid,
  'b1000000-0000-0000-0000-000000000010'::uuid,
  'b1000000-0000-0000-0000-000000000011'::uuid,
  'b1000000-0000-0000-0000-000000000015'::uuid,
  'b1000000-0000-0000-0000-000000000024'::uuid,
  'b1000000-0000-0000-0000-000000000016'::uuid
)
AND NULLIF(TRIM(branch), '') IS NULL;

-- Demo students: college placement verification ON (no “pending approval” banner). Mirrors migrations/025.
UPDATE student_profiles
SET is_verified = true, verified_at = COALESCE(verified_at, NOW())
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000007'::uuid,
  'b1000000-0000-0000-0000-000000000008'::uuid,
  'b1000000-0000-0000-0000-000000000009'::uuid,
  'b1000000-0000-0000-0000-000000000010'::uuid,
  'b1000000-0000-0000-0000-000000000011'::uuid,
  'b1000000-0000-0000-0000-000000000015'::uuid,
  'b1000000-0000-0000-0000-000000000024'::uuid,
  'b1000000-0000-0000-0000-000000000023'::uuid,
  'b1000000-0000-0000-0000-000000000016'::uuid
);

-- 6. Student Skills
INSERT INTO student_skills (student_id, skill_name, proficiency) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'Python', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'JavaScript', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'React', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'Machine Learning', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'SQL', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'Python', 'expert'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'TensorFlow', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'NLP', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'Java', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'Docker', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'C/C++', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'VHDL', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'Arduino', 'advanced'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'Python', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'EE2021102'), 'MATLAB', 'intermediate'),
((SELECT id FROM student_profiles WHERE roll_number = 'EE2021102'), 'Power Systems', 'intermediate');

-- 7. Job Postings
INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status) VALUES
('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Software Development Engineer', 'Join our engineering team to build scalable products used by millions. Work on cutting-edge technologies including cloud computing, microservices, and distributed systems.', 'full_time', 'Engineering', ARRAY['Bangalore', 'Hyderabad'], 1200000, 1800000, ARRAY['Computer Science & Engineering', 'Information Technology'], 7.0, 0, 2026, ARRAY['Java', 'Python', 'DSA', 'System Design'], 15, 'published'),
('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Data Science Intern', 'Work with our data science team on real-world problems in ML and analytics. 6-month internship with PPO opportunity.', 'internship', 'Data Science', ARRAY['Bangalore'], 60000, 80000, ARRAY['Computer Science & Engineering', 'Mathematics'], 8.0, 0, 2026, ARRAY['Python', 'Machine Learning', 'Statistics'], 5, 'published'),
('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Full Stack Developer', 'Build enterprise-grade web applications using modern JavaScript frameworks and cloud technologies.', 'full_time', 'Engineering', ARRAY['Pune', 'Chennai'], 1000000, 1500000, ARRAY['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication'], 6.5, 1, 2026, ARRAY['React', 'Node.js', 'PostgreSQL'], 10, 'published'),
('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', 'Systems Engineer', 'Join Infosys as a Systems Engineer and work on cutting-edge projects across domains.', 'full_time', 'Engineering', ARRAY['Bangalore', 'Mysuru', 'Pune'], 800000, 1000000, ARRAY['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering', 'Electrical Engineering'], 6.0, 0, 2026, ARRAY['Java', 'SQL', 'Problem Solving'], 50, 'published'),
('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'TechCorp Innovations Hackathon', 'Join the largest coding hackathon. Build innovative solutions using GenAI and win amazing prizes + PPO opportunities.', 'hackathon', 'Engineering', ARRAY['Virtual'], 0, 0, ARRAY['Computer Science & Engineering', 'Information Technology'], 5.0, 0, 2026, ARRAY['Problem Solving', 'Coding'], 100, 'published'),
('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002', 'GlobalSoft Summer Project', 'Short term summer project on modernizing legacy systems using microservices architecture.', 'short_project', 'Engineering', ARRAY['Remote'], 20000, 30000, ARRAY['Computer Science & Engineering'], 7.0, 0, 2026, ARRAY['Java', 'Spring Boot', 'Microservices'], 10, 'published'),
('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000005', 'Alumni Mentorship Program 2026', 'Get paired with senior industry leaders who are alumni of BITS Pilani for a 6-month mentorship covering career guidance, interview prep, and networking.', 'mentorship', 'Career Growth', ARRAY['Virtual'], 0, 0, ARRAY['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering'], 5.0, 0, 2026, ARRAY['Communication', 'Leadership'], 50, 'published'),
('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'Guest Faculty in AI/ML', 'Looking for industry experts to conduct a 2-week workshop on Advanced Machine Learning and Neural Networks for pre-final year students.', 'guest_faculty', 'Education', ARRAY['Trichy'], 100000, 150000, ARRAY['Computer Science & Engineering'], 5.0, 0, 0, ARRAY['AI/ML', 'Teaching', 'Industry Experience'], 2, 'published'),
('d1000000-0000-0000-0000-000000000103', 'c1000000-0000-0000-0000-000000000006', 'Applied ML Engineer — Campus', 'Build and ship LLM-powered workflows for enterprise customers; strong Python and evaluation metrics required.', 'full_time', 'Engineering', ARRAY['Bengaluru', 'Hyderabad'], 1400000, 1900000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.5, 0, 2026, ARRAY['Python', 'PyTorch', 'LLMs'], 8, 'published'),
('d1000000-0000-0000-0000-000000000104', 'c1000000-0000-0000-0000-000000000007', 'Risk Technology Analyst', 'Join the core risk platform team building real-time scoring and fraud detection pipelines.', 'full_time', 'FinTech', ARRAY['Mumbai', 'Pune'], 1100000, 1500000, ARRAY['Computer Science & Engineering', 'Mathematics'], 7.0, 0, 2026, ARRAY['Java', 'SQL', 'Statistics'], 12, 'published');

-- 8. Placement Drives
INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES
('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'TechCorp - SDE Recruitment Drive', 'Annual recruitment drive for Software Development Engineer positions.', 'on_campus', '2026-09-15', '09:00', '17:00', 'Placement Hall A', 'scheduled', 100, 45),
('e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 'GlobalSoft - Full Stack Developer Hiring', 'Hiring full stack developers for Pune and Chennai offices.', 'virtual', '2026-09-22', '10:00', '16:00', 'Online (Zoom)', 'approved', 80, 32),
('e1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 'Infosys - Mass Recruitment 2026', 'Mega hiring drive for Systems Engineer role across multiple branches.', 'on_campus', '2026-10-05', '08:30', '18:00', 'Main Auditorium', 'requested', 200, 0),
('e1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000103', 'Innovent Labs — IIT Madras ML drive', 'On-campus hiring for Applied ML Engineer; includes online assessment and panel interviews.', 'hybrid', '2026-10-18', '09:00', '17:00', 'CRC Seminar Block + online assessment', 'scheduled', 60, 12),
('e1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000104', 'FinEdge Systems — Risk Tech @ IITM', 'Campus recruitment for Risk Technology Analyst; pre-placement talk followed by process rounds.', 'on_campus', '2026-10-25', '08:45', '18:30', 'Department of Management Studies Hall', 'approved', 90, 24),
('e1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 'Infosys — NIT Trichy Campus Drive', 'Systems Engineer hiring — same role as IITM cycle, hosted at NIT Trichy.', 'on_campus', '2026-10-12', '08:30', '18:00', 'Seminar Hall 2', 'scheduled', 200, 18),
('e1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000007', 'BITS Pilani — Mentorship briefing', 'On-campus orientation for alumni mentorship cohort.', 'on_campus', '2026-09-28', '14:00', '17:00', 'FD III Seminar Room', 'approved', 80, 6);

-- 9. Drive Rounds
INSERT INTO drive_rounds (drive_id, round_number, round_type, title, scheduled_date, is_eliminatory) VALUES
('e1000000-0000-0000-0000-000000000001', 1, 'aptitude', 'Online Aptitude Test', '2026-09-15', true),
('e1000000-0000-0000-0000-000000000001', 2, 'coding', 'Coding Round', '2026-09-15', true),
('e1000000-0000-0000-0000-000000000001', 3, 'technical_interview', 'Technical Interview', '2026-09-16', true),
('e1000000-0000-0000-0000-000000000001', 4, 'hr_interview', 'HR Interview', '2026-09-16', false),
('e1000000-0000-0000-0000-000000000002', 1, 'coding', 'Online Coding Assessment', '2026-09-22', true),
('e1000000-0000-0000-0000-000000000002', 2, 'technical_interview', 'Technical Interview (Video)', '2026-09-23', true),
('e1000000-0000-0000-0000-000000000002', 3, 'hr_interview', 'HR Discussion', '2026-09-23', false),
('e1000000-0000-0000-0000-000000000010', 1, 'aptitude', 'Online aptitude', '2026-10-12', true),
('e1000000-0000-0000-0000-000000000011', 1, 'other', 'Mentorship orientation', '2026-09-28', false),
('e1000000-0000-0000-0000-000000000020', 1, 'coding', 'Take-home ML challenge', '2026-10-17', true),
('e1000000-0000-0000-0000-000000000020', 2, 'technical_interview', 'ML system design panel', '2026-10-18', true),
('e1000000-0000-0000-0000-000000000020', 3, 'hr_interview', 'Culture & offer discussion', '2026-10-18', false),
('e1000000-0000-0000-0000-000000000021', 1, 'ppt', 'Pre-placement talk', '2026-10-24', false),
('e1000000-0000-0000-0000-000000000021', 2, 'aptitude', 'Aptitude + quant screening', '2026-10-25', true),
('e1000000-0000-0000-0000-000000000021', 3, 'technical_interview', 'Risk & systems round', '2026-10-25', true),
('e1000000-0000-0000-0000-000000000021', 4, 'hr_interview', 'HR round', '2026-10-25', false);

-- 10. Applications
INSERT INTO applications (student_id, drive_id, job_id, status, current_round, applied_at) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'shortlisted', 2, NOW() - INTERVAL '5 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'in_progress', 3, NOW() - INTERVAL '5 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 'applied', 0, NOW() - INTERVAL '2 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021003'), 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'selected', 4, NOW() - INTERVAL '5 days');

-- 10b. Employer assessment CSV upload (demo — TechCorp SDE drive @ IIT Madras; login as hr@techcorp.com to see upload history)
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

-- 11. Offers
INSERT INTO offers (application_id, student_id, employer_id, drive_id, job_title, salary, joining_date, location, status, deadline) VALUES
((SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021003' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
 (SELECT id FROM student_profiles WHERE roll_number = 'CS2021003'),
 'c1000000-0000-0000-0000-000000000001',
 'e1000000-0000-0000-0000-000000000001',
 'Software Development Engineer',
 1500000, '2026-07-01', 'Bangalore', 'accepted', NOW() + INTERVAL '7 days');

-- 12. Notifications
INSERT INTO notifications (user_id, title, message, type, link) VALUES
('b1000000-0000-0000-0000-000000000007', 'Shortlisted for TechCorp Drive', 'Congratulations! You have been shortlisted for the coding round at TechCorp.', 'success', '/dashboard/student/applications'),
('b1000000-0000-0000-0000-000000000008', 'Interview Scheduled', 'Your technical interview for TechCorp SDE position is scheduled for Sep 16.', 'drive', '/dashboard/student/applications'),
('b1000000-0000-0000-0000-000000000002', 'New Drive Request', 'Infosys has requested a placement drive on Oct 5, 2026. Please review.', 'info', '/dashboard/college/drives'),
('b1000000-0000-0000-0000-000000000010', 'Offer Received!', 'You have received an offer from TechCorp for SDE position. Accept before deadline.', 'offer', '/dashboard/student/offers');

-- 13. Job posting visibility (critical for student-side visibility)
INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES
('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000103', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000104', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003'),
('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003'),
('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'),
('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003'),
('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003');
-- Historical job ids d101/d102: visibility inserted after those job_postings rows (see below).

-- 14. Employer approvals (workflow coverage: approved + pending + rejected)
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, rejection_reason, created_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '25 days', NULL, NOW() - INTERVAL '30 days'),
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '20 days', NULL, NOW() - INTERVAL '24 days'),
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '3 days'),
('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'approved', 'b1000000-0000-0000-0000-000000000003', NOW() - INTERVAL '16 days', NULL, NOW() - INTERVAL '18 days'),
('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'rejected', 'b1000000-0000-0000-0000-000000000003', NOW() - INTERVAL '7 days', 'Past no-show in prior drive cycle', NOW() - INTERVAL '9 days'),
('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'approved', 'b1000000-0000-0000-0000-000000000012', NOW() - INTERVAL '11 days', NULL, NOW() - INTERVAL '13 days'),
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 'approved', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days', NULL, NOW() - INTERVAL '14 days'),
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000008', 'approved', 'b1000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days', NULL, NOW() - INTERVAL '12 days'),
('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000009', 'approved', 'b1000000-0000-0000-0000-000000000012', NOW() - INTERVAL '8 days', NULL, NOW() - INTERVAL '9 days');

-- 15. Program applications (internships / projects / hackathons / mentorship / guest faculty)
INSERT INTO program_applications (student_id, job_id, status, notes, applied_at) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'd1000000-0000-0000-0000-000000000002', 'applied', 'Interested in NLP-focused workstreams.', NOW() - INTERVAL '6 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'd1000000-0000-0000-0000-000000000002', 'shortlisted', 'Strong ML profile.', NOW() - INTERVAL '8 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021003'), 'd1000000-0000-0000-0000-000000000005', 'selected', 'Hackathon finalist.', NOW() - INTERVAL '12 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021201'), 'd1000000-0000-0000-0000-000000000007', 'applied', 'Alumni mentorship request.', NOW() - INTERVAL '4 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'), 'd1000000-0000-0000-0000-000000000006', 'in_progress', 'Summer project technical round scheduled.', NOW() - INTERVAL '10 days'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'd1000000-0000-0000-0000-000000000008', 'applied', 'Guest faculty assistant applicant.', NOW() - INTERVAL '3 days');

-- 16. Shortlists / round outcomes with scores
INSERT INTO shortlists (application_id, round_id, status, score, feedback, evaluated_by, evaluated_at) VALUES
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021001' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000001' AND round_number = 1 LIMIT 1),
  'qualified', 78.50, 'Cleared aptitude threshold.', 'b1000000-0000-0000-0000-000000000004', NOW() - INTERVAL '5 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021002' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000001' AND round_number = 2 LIMIT 1),
  'qualified', 84.00, 'Coding round passed.', 'b1000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021003' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  (SELECT id FROM drive_rounds WHERE drive_id = 'e1000000-0000-0000-0000-000000000001' AND round_number = 3 LIMIT 1),
  'qualified', 88.25, 'Excellent system design discussion.', 'b1000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 days'
);

-- 17. Application status audit trail
INSERT INTO application_status_log (application_id, from_status, to_status, changed_by, remarks, changed_at) VALUES
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021001' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  'applied', 'shortlisted', 'b1000000-0000-0000-0000-000000000004', 'Qualified in aptitude + profile screen.', NOW() - INTERVAL '5 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021002' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  'shortlisted', 'in_progress', 'b1000000-0000-0000-0000-000000000004', 'Moved to technical interview stage.', NOW() - INTERVAL '4 days'
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021003' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001'),
  'in_progress', 'selected', 'b1000000-0000-0000-0000-000000000004', 'Final panel approved offer recommendation.', NOW() - INTERVAL '3 days'
);

-- 18. Student documents / CVs: only real uploads belong here.
-- Do not seed example-bucket.local or AWS URLs — missing objects surface raw S3 errors.
-- Demo profiles keep dummy.pdf on resume_url (ignored by the app) until a student uploads.

-- 19. College facilities / venues (for infrastructure booking)
INSERT INTO college_facilities (tenant_id, name, facility_type, capacity, has_projector, has_ac, has_wifi, has_video_conf, is_available) VALUES
('a1000000-0000-0000-0000-000000000001', 'Main Auditorium', 'Auditorium', 350, true, true, true, true, true),
('a1000000-0000-0000-0000-000000000001', 'Interview Room A1', 'Interview Room', 12, true, true, true, false, true),
('a1000000-0000-0000-0000-000000000002', 'Seminar Hall 2', 'Seminar Hall', 120, true, true, true, true, true),
('a1000000-0000-0000-0000-000000000002', 'Placement Cell Meeting Room', 'Meeting Room', 20, true, true, true, true, true),
('a1000000-0000-0000-0000-000000000003', 'Innovation Lab', 'Lab', 45, true, true, true, false, true);

-- 20. Calendar events (placement + workshop + holiday)
INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description) VALUES
('a1000000-0000-0000-0000-000000000001', 'TechCorp SDE Drive Day 1', 'placement_drive', '2026-09-15', '2026-09-15', true, '{"company":"TechCorp Solutions","roomId":"main-auditorium","roomName":"Main Auditorium","startTime":"09:00","endTime":"17:00","notes":"Aptitude + coding rounds","channels":["website","linkedin"]}'),
('a1000000-0000-0000-0000-000000000001', 'Resume Review Workshop', 'workshop', '2026-09-10', '2026-09-10', false, 'Career Services workshop for pre-final year students.'),
('a1000000-0000-0000-0000-000000000002', 'Infosys Campus Drive', 'placement_drive', '2026-10-05', '2026-10-05', true, '{"company":"Infosys Limited","roomId":"seminar-hall-2","roomName":"Seminar Hall 2","startTime":"08:30","endTime":"18:00","notes":"Mass recruitment process","channels":["website"]}'),
('a1000000-0000-0000-0000-000000000003', 'Placement Orientation 2026', 'other', '2026-08-20', '2026-08-20', false, 'Orientation for final-year placement process timeline.'),
('a1000000-0000-0000-0000-000000000003', 'Dussehra Holiday', 'holiday', '2026-10-26', '2026-10-26', true, 'Institute holiday');

-- 21. Additional applications for richer pipeline (rejected/withdrawn/on_hold)
INSERT INTO applications (student_id, drive_id, job_id, status, current_round, applied_at, withdrawal_reason, notes) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'ME2021001'), 'e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 'withdrawn', 0, NOW() - INTERVAL '2 days', 'Accepted higher studies admission', 'Withdrew before test round'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'), 'e1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000004', 'rejected', 1, NOW() - INTERVAL '6 days', NULL, 'Did not clear coding benchmark'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021201'), 'e1000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000007', 'on_hold', 1, NOW() - INTERVAL '1 days', NULL, 'Panel decision pending');

-- 22. Additional offers to cover pending/rejected/expired states
INSERT INTO offers (application_id, student_id, employer_id, drive_id, job_title, salary, joining_date, location, status, deadline, rejected_at, rejection_reason) VALUES
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021002' AND a.drive_id = 'e1000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'),
  'c1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Software Development Engineer',
  1650000, '2026-07-10', 'Hyderabad', 'pending', NOW() + INTERVAL '3 days', NULL, NULL
),
(
  (SELECT a.id FROM applications a JOIN student_profiles s ON a.student_id = s.id WHERE s.roll_number = 'CS2021101' AND a.drive_id = 'e1000000-0000-0000-0000-000000000010' LIMIT 1),
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'),
  'c1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000010',
  'Systems Engineer',
  950000, '2026-08-01', 'Mysuru', 'rejected', NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 day', 'Preferred higher package role'
),
(
  NULL,
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'),
  'c1000000-0000-0000-0000-000000000001',
  NULL,
  'Data Science Intern',
  720000, '2026-06-15', 'Bangalore', 'expired', NOW() - INTERVAL '5 days', NULL, NULL
);

-- 23. Employer ratings (post-placement feedback coverage)
INSERT INTO employer_ratings (employer_id, student_id, drive_id, professionalism, transparency, timeliness, overall_rating, feedback, is_anonymous) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021003'),
  'e1000000-0000-0000-0000-000000000001',
  5, 4, 5, 5, 'Process was clear and interviewers were very professional.', true
),
(
  'c1000000-0000-0000-0000-000000000002',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'),
  'e1000000-0000-0000-0000-000000000002',
  4, 4, 3, 4, 'Good process overall; schedule updates could be faster.', true
),
(
  'c1000000-0000-0000-0000-000000000003',
  (SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'),
  'e1000000-0000-0000-0000-000000000010',
  3, 4, 3, 3, 'Assessment quality was good, waiting times were high.', true
);

-- 23b. Campus guest lecture listings (published — visible on employer “Campus guest needs”)
INSERT INTO campus_engagement_listings (id, tenant_id, author_user_id, kind, title, summary, requirements, time_hint, status) VALUES
(
  'ef100000-0000-4000-8000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'guest_lecture',
  'Industry session: Generative AI in production systems',
  '90-minute talk plus Q&A on how enterprises deploy LLMs responsibly, with case studies from fintech and health-tech.',
  'Speaker should have 5+ years shipping ML systems; comfortable with prompt safety, evaluation, and cost controls. Optional hands-on notebook for a small cohort.',
  'Preferred: Feb–Mar 2026, weekday afternoon (IST). Hybrid acceptable.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000017',
  'guest_lecture',
  'Fireside: Cybersecurity careers and threat intelligence',
  'Interactive session aimed at pre-final and final-year students exploring security operations, GRC, and product security roles.',
  'Practitioner from SOC / red-team / appsec background; avoid pure vendor pitch. Include hiring pathways and certification guidance.',
  'March 2026 preferred; 60–75 minutes + networking buffer.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000003',
  'a1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'guest_lecture',
  'Product management 101: from discovery to launch',
  'Workshop-style lecture with exercises on problem framing, prioritisation (RICE), and stakeholder communication.',
  'PM with B2B or consumer product experience; familiar with analytics and experimentation. Bring one anonymised case study.',
  'Jan–Feb 2026; Saturday half-day possible.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000004',
  'a1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000012',
  'guest_lecture',
  'Guest demo: Autonomous systems and robotics in industry',
  'Overview of perception, planning, and safety for mobile robots; ties to campus labs and final-year projects.',
  'Speaker from robotics / automotive / drones; live demo or recorded walkthrough encouraged. Safety briefing required for any hardware.',
  'April 2026; flexible on weekday mornings.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000005',
  'a1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'guest_lecture',
  'FinTech careers panel: payments, credit, and compliance',
  'Panel of 2–3 executives on building regulated financial products in India; moderated Q&A with students.',
  'Mix of engineering and business leadership; topics: UPI scale, lending risk, data privacy. No confidential client data.',
  'Preferred: late Feb 2026; 2-hour block including audience questions.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000006',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'guest_lecture',
  'Cloud-native platforms: Kubernetes, observability, and SRE practices',
  'Session on how mid-size and large teams run production on Kubernetes: SLIs/SLOs, incident response, and cost-aware autoscaling.',
  'Practicing SRE or platform engineer; real outage stories welcome. Avoid tool-specific sales decks; focus on patterns students can reuse.',
  'March–April 2026; 75 minutes + 15 minutes Q&A.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000007',
  'a1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'guest_lecture',
  'Operations research in supply chain and logistics',
  'Talk bridging coursework in OR/optimization with demand forecasting, network design, and last-mile planning in Indian markets.',
  'Background in OR, analytics, or logistics tech; include one quantitative example (sanitised data).',
  'Feb 2026 preferred; weekday evening IST.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000008',
  'a1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000012',
  'guest_lecture',
  'VLSI, chip design, and careers in the semiconductor ecosystem',
  'Overview of front-end/back-end design flows, verification, and India’s role in global semiconductor supply chains.',
  'Speaker from silicon / EDA / fabless; optional RTL or timing closure anecdote. NDA-safe content only.',
  'May 2026; 90 minutes with student interaction.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000009',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000017',
  'guest_lecture',
  'HCI and UX research: from academic methods to product impact',
  'How qualitative and quantitative UX methods translate into product decisions; paths for CS and design-interested students.',
  'Practitioner or researcher with shipped product examples; include portfolio or study design tips.',
  'Jan 2026; hybrid or on-campus.',
  'published'
),
(
  'ef100000-0000-4000-8000-000000000010',
  'a1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'guest_lecture',
  'Green software and climate-tech engineering',
  'Energy-aware systems, carbon accounting for software, and career opportunities in climate-focused startups and enterprises.',
  'Speaker with measurable sustainability or cleantech experience; avoid unsubstantiated green claims.',
  'March 2026; 60-minute talk + panel-style Q&A.',
  'published'
);

-- 24. Sponsorship opportunities (DB-backed employer sponsorships)
INSERT INTO sponsorship_opportunities (id, tenant_id, category, description, tier_name, price_inr, benefits, label, is_active, payments_permitted) VALUES
('ab100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Campus Infrastructure', 'Support learning spaces, labs, and student infrastructure.', 'Bronze Sponsor', 300000, ARRAY['Brand mention on partner wall', 'Quarterly impact summary'], 'Popular', true, 1),
('ab100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Campus Infrastructure', 'Support learning spaces, labs, and student infrastructure.', 'Silver Sponsor', 600000, ARRAY['Bronze benefits', 'Feature in campus events bulletin'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Campus Infrastructure', 'Support learning spaces, labs, and student infrastructure.', 'Gold Sponsor', 1200000, ARRAY['Silver benefits', 'Priority branding slot on major events'], 'Premium', true, 1),
('ab100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Research & Labs', 'Upgrade lab infrastructure and student innovation facilities.', 'Equipment Sponsor', 400000, ARRAY['Lab naming acknowledgement', 'Annual innovation report access'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Research & Labs', 'Upgrade lab infrastructure and student innovation facilities.', 'Lab Partner', 900000, ARRAY['Equipment sponsor benefits', 'Mentor day co-branding'], 'Popular', true, 1),
('ab100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Alumni Mentorship', 'Fund mentorship and career readiness activities.', 'Community Sponsor', 250000, ARRAY['Brand mention in mentorship portal', 'Program completion highlights'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'Career Fair & Tech Expo', 'Annual placement and technology showcase; employer booths, student demos, and networking.', 'Exhibitor — Standard Booth', 450000, ARRAY['10x8 ft booth space', 'Two recruiter passes', 'Logo on event microsite'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'Career Fair & Tech Expo', 'Annual placement and technology showcase; employer booths, student demos, and networking.', 'Platinum — Prime Floor Booth', 950000, ARRAY['Premium corner booth', 'Keynote slide mention', 'Priority interview lounge slot'], 'Featured', true, 1),
('ab100000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'Hackathon & Innovation', 'Support inter-disciplinary hackathons and prototype showcases.', 'Hackathon Track Sponsor', 350000, ARRAY['Named challenge track', 'Mentor office hours slot', 'Winner prize co-branding'], 'Popular', true, 1),
('ab100000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'Scholarship & Access', 'Merit and need-based awards for undergraduate and postgraduate students.', 'Merit Scholarship Patron', 500000, ARRAY['Named scholarship (1 seat/year)', 'Annual scholar meet invite', 'Report on outcomes'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'Research & Industry Connect', 'Joint workshops, sabbaticals, and PhD engagement with industry labs.', 'Industry Lab Consortium — Associate', 750000, ARRAY['Seminar series co-host', 'Faculty visit day', 'Student project showcase slot'], NULL, true, 1),
('ab100000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', 'Sports & Wellness', 'Inter-IIT events, wellness programs, and student fitness infrastructure.', 'Wellness Series Sponsor', 280000, ARRAY['Branding at sports complex', 'Wellness week activation', 'Social media thank-you'], NULL, true, 1);

-- 24b. Startup seed funding opportunities (employer → college incubation programs)
INSERT INTO startup_funding_opportunities (id, tenant_id, category, description, tier_name, price_inr, benefits, label, is_active, payments_permitted) VALUES
('ac100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Incubation & Pre-seed', 'Support early-stage student startups in campus incubators with grant-style seed capital.', 'Micro Grant', 200000, ARRAY['Fund one pre-seed startup cohort slot', 'Quarterly progress digest', 'Invite to demo day'], 'Entry', true, 1),
('ac100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Incubation & Pre-seed', 'Support early-stage student startups in campus incubators with grant-style seed capital.', 'Pre-seed Partner', 750000, ARRAY['Micro grant benefits', 'Named mentor hours pool', 'Priority pitch to investors'], 'Popular', true, 1),
('ac100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Demo Day & Pitch', 'Fund demo day winners and inter-college pitch competitions.', 'Demo Day Prize Pool', 350000, ARRAY['Co-branded demo day awards', 'Judge seat for one representative', 'Media mention in event recap'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Sector Innovation Fund', 'Deep tech, climate, and healthtech ventures from student founders.', 'Deep Tech Seed', 1500000, ARRAY['Sector-specific startup shortlist access', 'Lab partnership day', 'Annual innovation report'], 'Featured', true, 1),
('ac100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Incubation & Pre-seed', 'Capital for NIT Trichy incubation hub ventures.', 'Campus Venture Grant', 250000, ARRAY['One incubation seat funded', 'Mentor connect session', 'Showcase on careers portal'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Mentor-linked Seed Pool', 'Seed capital paired with structured mentor engagement.', 'Mentor Seed Circle', 500000, ARRAY['Grant benefits', 'Quarterly mentor roundtable', 'Startup hiring visibility'], 'Popular', true, 1),
('ac100000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'Incubation & Pre-seed', 'Support BITS Pilani student-led ventures.', 'PIEDE Seed Grant', 300000, ARRAY['Incubation cell grant allocation', 'Demo showcase slot', 'Alumni investor intro'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Demo Day & Pitch', 'Prize and follow-on funding for pitch winners.', 'Pitch Winner Fund', 450000, ARRAY['Named pitch track', 'Winner prize co-funding', 'Employer office hours'], NULL, true, 1);

-- 25. Clarifications / Q&A (DB-backed)
INSERT INTO clarification_batches (id, tenant_id, company, posted_by, posted_at, created_by, created_at) VALUES
('c2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'TechCorp Solutions', 'Placement Office', CURRENT_DATE - INTERVAL '3 days', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
('c2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'GlobalSoft Technologies', 'Placement Office', CURRENT_DATE - INTERVAL '1 day', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day');

INSERT INTO clarification_questions (batch_id, question_text, answer_text, answered_by, answered_at) VALUES
('c2000000-0000-0000-0000-000000000001', 'Is there any relocation support for Hyderabad joining?', 'Yes, first-month accommodation support is provided.', 'TechCorp Recruitment Team', NOW() - INTERVAL '2 days'),
('c2000000-0000-0000-0000-000000000001', 'Will shortlisted students get a mock interview slot?', 'Yes, a mock slot will be published 48 hours before final interviews.', 'Placement Coordinator', NOW() - INTERVAL '2 days'),
('c2000000-0000-0000-0000-000000000002', 'Are ECE students eligible for the Full Stack role?', 'Yes, ECE with minimum CGPA 6.5 are eligible.', 'GlobalSoft Talent Team', NOW() - INTERVAL '12 hours');

-- 26. Student education
INSERT INTO student_education (student_id, institution, degree, field_of_study, start_year, end_year, grade, description) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'Indian Institute of Technology, Madras', 'B.Tech', 'Computer Science & Engineering', 2022, 2026, '8.72 CGPA', 'Core CS coursework with AI/ML electives.'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'Indian Institute of Technology, Madras', 'B.Tech', 'Computer Science & Engineering', 2022, 2026, '9.15 CGPA', 'Focus on NLP and distributed systems.'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'), 'NIT Trichy', 'B.Tech', 'Computer Science & Engineering', 2022, 2026, '8.90 CGPA', 'Strong backend and systems engineering profile.');

-- 27. Student projects (≥3 per college via student_profiles.tenant_id)
INSERT INTO student_projects (student_id, title, description, tech_stack, project_url, github_url, start_date, end_date) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'Campus Hiring Analytics Dashboard', 'Dashboard for placement pipeline insights and recruiter conversion tracking.', ARRAY['React', 'Node.js', 'PostgreSQL'], 'https://projects.example.com/hiring-analytics', 'https://github.com/example/hiring-analytics', '2026-01-15', '2026-05-20'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'Interview Assistant Bot', 'NLP chatbot to answer candidate FAQs before interview rounds.', ARRAY['Python', 'FastAPI', 'Transformers'], 'https://projects.example.com/interview-bot', 'https://github.com/example/interview-bot', '2026-02-10', '2026-06-30'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021001'), 'IoT Energy Monitor', 'Low-power sensor mesh for hostel energy analytics.', ARRAY['C', 'MQTT', 'ESP32'], 'https://projects.example.com/iot-energy', 'https://github.com/example/iot-energy', '2026-04-01', '2026-08-30'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'), 'NITT Placement Portal Widgets', 'Embeddable widgets for drive registration status.', ARRAY['Vue', 'TypeScript'], 'https://projects.example.com/nitt-widgets', 'https://github.com/example/nitt-widgets', '2026-02-01', '2026-06-15'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021101'), 'Smart Timetable Sync', 'Two-way sync between academic timetable and calendar apps.', ARRAY['Python', 'iCal', 'FastAPI'], 'https://projects.example.com/timetable-sync', NULL, '2026-03-10', '2026-07-01'),
((SELECT id FROM student_profiles WHERE roll_number = 'EE2021102'), 'Microgrid Simulation Toolkit', 'MATLAB toolkit for campus microgrid what-if analysis.', ARRAY['MATLAB', 'Simulink'], 'https://projects.example.com/microgrid', NULL, '2026-01-20', '2026-05-10'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021201'), 'Alumni Mentorship Matcher', 'Recommendation system to pair students with alumni mentors.', ARRAY['Next.js', 'TypeScript', 'PostgreSQL'], 'https://projects.example.com/mentor-match', 'https://github.com/example/mentor-match', '2026-03-01', '2026-07-15'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021201'), 'BITS Course Recommender', 'Graph-based elective recommendation from historical grades.', ARRAY['Python', 'NetworkX', 'Streamlit'], 'https://projects.example.com/course-rec', 'https://github.com/example/course-rec', '2026-04-05', NULL);

-- 28. Message templates
INSERT INTO message_templates (tenant_id, name, subject, body, template_type, variables, is_active) VALUES
('a1000000-0000-0000-0000-000000000001', 'Drive Shortlist Notification', 'You are shortlisted for {{driveTitle}}', 'Hi {{studentName}}, congratulations! You are shortlisted for {{driveTitle}} at {{companyName}}. Please check your dashboard for next steps.', 'notification', ARRAY['studentName', 'driveTitle', 'companyName'], true),
('a1000000-0000-0000-0000-000000000001', 'Offer Released Email', 'Offer letter for {{jobTitle}}', 'Dear {{studentName}}, your offer for {{jobTitle}} has been released by {{companyName}}. Review and respond before {{deadline}}.', 'email', ARRAY['studentName', 'jobTitle', 'companyName', 'deadline'], true),
('a1000000-0000-0000-0000-000000000002', 'Interview Reminder', 'Interview reminder: {{driveTitle}}', 'This is a reminder for your interview round scheduled on {{date}} at {{time}} for {{driveTitle}}.', 'email', ARRAY['driveTitle', 'date', 'time'], true);

-- 29. Audit logs
INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at) VALUES
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'CREATE_DRIVE', 'placement_drives', 'e1000000-0000-0000-0000-000000000001', NULL, '{"status":"scheduled","title":"TechCorp - SDE Recruitment Drive"}', '10.10.1.21', NOW() - INTERVAL '6 days'),
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'UPDATE_APPLICATION_STATUS', 'applications', (SELECT id FROM applications ORDER BY applied_at ASC LIMIT 1), '{"status":"applied"}', '{"status":"shortlisted"}', '10.10.2.55', NOW() - INTERVAL '5 days'),
('b1000000-0000-0000-0000-000000000001', NULL, 'UPDATE_PLATFORM_SETTINGS', 'tenants', 'a1000000-0000-0000-0000-000000000001', '{"maintenanceMode":false}', '{"maintenanceMode":false,"notice":"Placement week schedule published"}', '10.10.0.10', NOW() - INTERVAL '2 days');

-- 30. Platform feedback + replies
INSERT INTO platform_feedback (id, user_id, title, category, description, status, created_at) VALUES
(
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000007',
  'Need clearer interview timelines',
  'General Feedback',
  'Student dashboard should show exact round times and timezone details.',
  'Under Review',
  NOW() - INTERVAL '6 days'
),
(
  'f1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000004',
  'Bulk invite import for interview panels',
  'Feature Request',
  'Employer interview scheduling should support CSV import for panelists.',
  'Planned',
  NOW() - INTERVAL '4 days'
),
(
  'f1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000002',
  'Calendar overlap warning not visible',
  'Bug Report',
  'When creating two bookings at same time, the conflict warning did not show.',
  'Submitted',
  NOW() - INTERVAL '2 days'
),
(
  'f1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000003',
  'Export shortlist to Excel with CGPA',
  'Feature Request',
  'Placement office needs one-click export of shortlisted students including CGPA and branch.',
  'Under Review',
  NOW() - INTERVAL '9 days'
),
(
  'f1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000012',
  'Branding on student-facing offer letters',
  'General Feedback',
  'Allow each campus to upload a header logo for PDF offer summaries.',
  'Submitted',
  NOW() - INTERVAL '8 days'
),
(
  'f1000000-0000-0000-0000-000000000006',
  'b1000000-0000-0000-0000-000000000008',
  'Resume parser misses dual degrees',
  'Bug Report',
  'Uploading a combined PDF for dual degree only extracts the first program.',
  'Under Review',
  NOW() - INTERVAL '7 days'
),
(
  'f1000000-0000-0000-0000-000000000007',
  'b1000000-0000-0000-0000-000000000005',
  'Job visibility filters by graduation year',
  'Feature Request',
  'Recruiters want to target 2025 vs 2026 batch in one posting without duplicate jobs.',
  'Planned',
  NOW() - INTERVAL '11 days'
),
(
  'f1000000-0000-0000-0000-000000000008',
  'b1000000-0000-0000-0000-000000000018',
  'API hooks for ATS stage updates',
  'Feature Request',
  'Webhook or polling endpoint when application status changes from applied to shortlisted.',
  'Submitted',
  NOW() - INTERVAL '5 days'
),
(
  'f1000000-0000-0000-0000-000000000009',
  'b1000000-0000-0000-0000-000000000015',
  'Interview slot waitlist notifications',
  'General Feedback',
  'Students on waitlist should get email when a slot frees up.',
  'Closed',
  NOW() - INTERVAL '14 days'
),
(
  'f1000000-0000-0000-0000-000000000010',
  'b1000000-0000-0000-0000-000000000019',
  'Assessment integrity timer display',
  'Bug Report',
  'Timer bar freezes on Safari when tab is backgrounded for >2 minutes.',
  'Submitted',
  NOW() - INTERVAL '3 days'
),
(
  'f1000000-0000-0000-0000-000000000011',
  'b1000000-0000-0000-0000-000000000017',
  'Bulk reminder to students pending documents',
  'Feature Request',
  'Send templated nudge to students missing mandatory uploads before drive day.',
  'Planned',
  NOW() - INTERVAL '10 days'
),
(
  'f1000000-0000-0000-0000-000000000012',
  'b1000000-0000-0000-0000-000000000006',
  'Campus hiring analytics dashboard',
  'General Feedback',
  'Infosys TA team would like funnel metrics exportable by college.',
  'Under Review',
  NOW() - INTERVAL '6 days'
),
(
  'f1000000-0000-0000-0000-000000000013',
  'b1000000-0000-0000-0000-000000000002',
  'Bulk approve drive registrations by department',
  'Feature Request',
  'IIT Madras placement office needs to shortlist 200+ registrations in one action filtered by department and CGPA cutoff.',
  'Under Review',
  NOW() - INTERVAL '16 days'
),
(
  'f1000000-0000-0000-0000-000000000014',
  'b1000000-0000-0000-0000-000000000009',
  'Push notification when shortlist is published',
  'General Feedback',
  'Students miss email during end-sem; optional SMS or push for shortlist would help IITM candidates.',
  'Submitted',
  NOW() - INTERVAL '15 days'
),
(
  'f1000000-0000-0000-0000-000000000015',
  'b1000000-0000-0000-0000-000000000010',
  'Side-by-side offer comparison on dashboard',
  'Feature Request',
  'Allow comparing two offers (CTC, location, bond) in one view before accepting.',
  'Planned',
  NOW() - INTERVAL '13 days'
),
(
  'f1000000-0000-0000-0000-000000000016',
  'b1000000-0000-0000-0000-000000000017',
  'Lock CGPA snapshot at pre-placement briefing',
  'Bug Report',
  'After PPO briefing, some profiles still show live CGPA updates — policy requires frozen snapshot for IITM season.',
  'Submitted',
  NOW() - INTERVAL '12 days'
),
(
  'f1000000-0000-0000-0000-000000000017',
  'b1000000-0000-0000-0000-000000000011',
  'Export workshop RSVP to Google Sheet',
  'Feature Request',
  'Mechanical dept runs pre-placement workshops; need one-click export of attendee list with roll numbers.',
  'Under Review',
  NOW() - INTERVAL '4 days'
),
(
  'f1000000-0000-0000-0000-000000000018',
  'b1000000-0000-0000-0000-000000000007',
  'Dark mode for student dashboard',
  'Feature Request',
  'Evening prep sessions hurt my eyes; a system-aware dark theme would help.',
  'Submitted',
  NOW() - INTERVAL '20 hours'
),
(
  'f1000000-0000-0000-0000-000000000019',
  'b1000000-0000-0000-0000-000000000007',
  'Application status stuck on Applied after shortlist email',
  'Bug Report',
  'Received shortlist mail from recruiter but dashboard still shows only Applied for that job.',
  'Under Review',
  NOW() - INTERVAL '2 days'
),
(
  'f1000000-0000-0000-0000-000000000020',
  'b1000000-0000-0000-0000-000000000007',
  'Save job filters between sessions',
  'General Feedback',
  'Remember my last branch/CGPA filters on the jobs board so I do not reset them every login.',
  'Planned',
  NOW() - INTERVAL '4 days'
),
(
  'f1000000-0000-0000-0000-000000000021',
  'b1000000-0000-0000-0000-000000000007',
  'Interview prep resources per company',
  'Feature Request',
  'Link optional prep packs or past-year topics next to each shortlisted drive.',
  'Submitted',
  NOW() - INTERVAL '5 days'
),
(
  'f1000000-0000-0000-0000-000000000022',
  'b1000000-0000-0000-0000-000000000007',
  'CGPA shown with two decimals everywhere',
  'General Feedback',
  'Profile shows 8.72 but some lists round to one decimal — please standardize to two.',
  'Submitted',
  NOW() - INTERVAL '7 days'
),
(
  'f1000000-0000-0000-0000-000000000023',
  'b1000000-0000-0000-0000-000000000002',
  'Room capacity vs registered students on drive day',
  'General Feedback',
  'IIT Madras needs a live headcount widget when check-in exceeds hall capacity for on-campus rounds.',
  'Submitted',
  NOW() - INTERVAL '18 hours'
),
(
  'f1000000-0000-0000-0000-000000000024',
  'b1000000-0000-0000-0000-000000000002',
  'Defer offer deadline for GATE-qualified dual-degree students',
  'Feature Request',
  'Allow T&P to extend acceptance deadline per student when thesis defense dates clash.',
  'Under Review',
  NOW() - INTERVAL '3 days'
),
(
  'f1000000-0000-0000-0000-000000000025',
  'b1000000-0000-0000-0000-000000000002',
  'Audit log export for accreditation visit',
  'Feature Request',
  'One PDF or CSV of placement actions (shortlists, offers) for NAAC documentation.',
  'Planned',
  NOW() - INTERVAL '5 days'
),
(
  'f1000000-0000-0000-0000-000000000026',
  'b1000000-0000-0000-0000-000000000002',
  'Employer job edits after publish',
  'Bug Report',
  'Recruiter fixed stipend on published internship but student view still shows old stipend until hard refresh.',
  'Submitted',
  NOW() - INTERVAL '1 days'
),
(
  'f1000000-0000-0000-0000-000000000027',
  'b1000000-0000-0000-0000-000000000002',
  'Multi-campus consent for shared employer webinars',
  'General Feedback',
  'When three institutes join one webinar, record which students opted in from each campus.',
  'Submitted',
  NOW() - INTERVAL '6 days'
);

INSERT INTO platform_feedback_replies (feedback_id, author_user_id, message, channel, created_at) VALUES
(
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Thanks for reporting this. We are reviewing timeline UX improvements.',
  'dashboard',
  NOW() - INTERVAL '5 days'
),
(
  'f1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'Feature accepted into planning for the next release.',
  'dashboard',
  NOW() - INTERVAL '3 days'
),
(
  'f1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'Could you share repro steps (browser + exact time overlap)?',
  'dashboard',
  NOW() - INTERVAL '1 days'
),
(
  'f1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  'We are scoping CSV/XLSX export for shortlists in the next sprint.',
  'dashboard',
  NOW() - INTERVAL '8 days'
),
(
  'f1000000-0000-0000-0000-000000000006',
  'b1000000-0000-0000-0000-000000000001',
  'Logged — please try splitting PDFs per degree or paste plain text as fallback.',
  'dashboard',
  NOW() - INTERVAL '6 days'
),
(
  'f1000000-0000-0000-0000-000000000009',
  'b1000000-0000-0000-0000-000000000001',
  'Shipped in v0.9 — waitlist emails now fire when a slot opens.',
  'dashboard',
  NOW() - INTERVAL '13 days'
),
(
  'f1000000-0000-0000-0000-000000000012',
  'b1000000-0000-0000-0000-000000000001',
  'We are aligning with the college analytics export; will share a beta CSV next week.',
  'dashboard',
  NOW() - INTERVAL '5 days'
),
(
  'f1000000-0000-0000-0000-000000000013',
  'b1000000-0000-0000-0000-000000000001',
  'Bulk actions for drive registration are in design; we will pilot with IIT Madras filters first.',
  'dashboard',
  NOW() - INTERVAL '14 days'
),
(
  'f1000000-0000-0000-0000-000000000015',
  'b1000000-0000-0000-0000-000000000001',
  'Offer comparison mockups are in review with a few campuses including IITM.',
  'dashboard',
  NOW() - INTERVAL '12 days'
),
(
  'f1000000-0000-0000-0000-000000000017',
  'b1000000-0000-0000-0000-000000000001',
  'CSV export for event RSVPs is queued behind the shortlist export work.',
  'dashboard',
  NOW() - INTERVAL '3 days'
),
(
  'f1000000-0000-0000-0000-000000000019',
  'b1000000-0000-0000-0000-000000000001',
  'We are checking webhook sync with the employer ATS — please confirm company name and job id.',
  'dashboard',
  NOW() - INTERVAL '1 days'
),
(
  'f1000000-0000-0000-0000-000000000020',
  'b1000000-0000-0000-0000-000000000001',
  'Saved filters are scoped for the next release; thanks for the detailed note.',
  'dashboard',
  NOW() - INTERVAL '3 days'
),
(
  'f1000000-0000-0000-0000-000000000024',
  'b1000000-0000-0000-0000-000000000001',
  'We can add a per-student deadline override in the offer module — tracking your ticket.',
  'dashboard',
  NOW() - INTERVAL '2 days'
),
(
  'f1000000-0000-0000-0000-000000000025',
  'b1000000-0000-0000-0000-000000000001',
  'Accreditation export is on the roadmap as “compliance pack v1”.',
  'dashboard',
  NOW() - INTERVAL '4 days'
);

-- Completed drives (2026 season) for year-wise / analytics testing — no schedule dates before 2026
INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status) VALUES
('d1000000-0000-0000-0000-000000000101', 'c1000000-0000-0000-0000-000000000001', 'Data Science Intern 2026', 'Completed internship listing for analytics tests.', 'internship', 'Data Science', ARRAY['Bangalore'], 55000, 75000, ARRAY['Computer Science & Engineering', 'Mathematics'], 7.5, 0, 2026, ARRAY['Python', 'ML'], 6, 'published'),
('d1000000-0000-0000-0000-000000000102', 'c1000000-0000-0000-0000-000000000002', 'Platform Engineering Intern 2026', 'Completed internship listing for analytics tests.', 'internship', 'Engineering', ARRAY['Chennai'], 50000, 70000, ARRAY['Computer Science & Engineering', 'Information Technology'], 7.0, 1, 2026, ARRAY['Node.js', 'PostgreSQL'], 8, 'published');

INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES
('d1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000003'),
('d1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000003');

INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count) VALUES
('e1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000101', 'TechCorp Internship Drive 2026', 'Completed drive record for analytics testing.', 'on_campus', DATE '2026-07-18', TIME '10:00', TIME '17:00', 'IITM Main Hall', 'completed', 120, 54),
('e1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000102', 'GlobalSoft Internship Drive 2026', 'Completed drive record for analytics testing.', 'virtual', DATE '2026-08-10', TIME '09:00', TIME '16:00', 'Online', 'completed', 100, 48);

INSERT INTO program_applications (student_id, job_id, status, notes, applied_at) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021001'), 'd1000000-0000-0000-0000-000000000101', 'selected', 'Selected in 2026 internship cycle.', TIMESTAMP '2026-08-20 11:15:00'),
((SELECT id FROM student_profiles WHERE roll_number = 'CS2021002'), 'd1000000-0000-0000-0000-000000000102', 'in_progress', 'Reached final technical round in 2026 cycle.', TIMESTAMP '2026-08-25 14:30:00');


-- APPENDIX: TCS and Extended Tie-ups

-- 1. Add TCS
INSERT INTO users (id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000022', 'hr@tcs.com', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'TCS', 'HR', true, true);

INSERT INTO employer_profiles (id, user_id, company_name, company_slug, industry, company_type, company_size, founded_year, website, logo_url, description, headquarters, locations) VALUES
('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000022', 'Tata Consultancy Services (TCS)', 'tcs', 'Information Technology', 'mnc', '10000+', 1968, 'https://techcorp.com/', '/logos/seed-tcs.svg', 'Global leader in IT services, consulting, and business solutions.', 'Mumbai, India', ARRAY['Mumbai', 'Pune', 'Bangalore', 'Chennai', 'Hyderabad']);

-- 2. Add second student to BITS Pilani
INSERT INTO users (id, tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_active, is_verified, phone) VALUES
('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000003', 'priya.singh@bits.edu', 'sandeepjain200019@gmail.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Priya', 'Singh', true, true, '+919800100023');

INSERT INTO student_profiles (user_id, tenant_id, roll_number, enrollment_number, department, branch, batch_year, graduation_year, cgpa, tenth_percentage, twelfth_percentage, gender, placement_status, is_verified, verified_at, bio, resume_url) VALUES
('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000003', 'EC2021202', 'ENR-BITS-EC2021202', 'Electronics', 'Electronics & Communication', 2026, 2026, 8.85, 96.0, 94.0, 'female', 'unplaced', true, NOW(), 'Passionate about embedded systems.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

INSERT INTO student_projects (student_id, title, description, tech_stack, project_url, github_url, start_date, end_date) VALUES
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021202'), 'FPGA Signal Lab', 'Teaching lab exercises for DSP on FPGA boards.', ARRAY['VHDL', 'Verilog'], 'https://projects.example.com/fpga-lab', NULL, '2026-05-01', '2026-09-01'),
((SELECT id FROM student_profiles WHERE roll_number = 'EC2021202'), 'Campus Shuttle ETA', 'Live shuttle tracking mini-app for Pilani campus.', ARRAY['React Native', 'Node.js'], 'https://projects.example.com/shuttle-eta', NULL, '2026-02-15', '2026-06-30');

-- No seeded resume document for Priya Singh — upload a real CV in the app.

-- 3. Tie up every employer to all three seeded colleges (≥2 employers per campus; here: full grid, all approved)
DELETE FROM employer_approvals;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at)
SELECT
  t.id,
  e.id,
  'approved',
  CASE t.id
    WHEN 'a1000000-0000-0000-0000-000000000001'::uuid THEN 'b1000000-0000-0000-0000-000000000002'::uuid
    WHEN 'a1000000-0000-0000-0000-000000000002'::uuid THEN 'b1000000-0000-0000-0000-000000000003'::uuid
    WHEN 'a1000000-0000-0000-0000-000000000003'::uuid THEN 'b1000000-0000-0000-0000-000000000012'::uuid
  END,
  NOW(),
  NOW()
FROM tenants t
CROSS JOIN employer_profiles e
WHERE t.id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);

-- 3b. Testing default: every employer has an approved tie-up with IIT Madras (re-run safe)
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_at, created_at)
SELECT
  t.id,
  ep.id,
  'approved',
  NOW(),
  NOW()
FROM tenants t
CROSS JOIN employer_profiles ep
WHERE t.is_active = true
  AND t.type = 'college'
  AND (
    t.slug = 'iit-madras'
    OR t.id = 'a1000000-0000-0000-0000-000000000001'::uuid
    OR t.name ILIKE '%Indian Institute of Technology, Madras%'
  )
ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
  status = 'approved',
  approved_at = COALESCE(employer_approvals.approved_at, NOW()),
  rejection_reason = NULL,
  approved_by = COALESCE(
    employer_approvals.approved_by,
    (SELECT id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1)
  );

-- 4. Create Job, Internship, Project, and Drive for EVERY employer at IITM
DO $$
DECLARE
  emp RECORD;
  col1 UUID := 'a1000000-0000-0000-0000-000000000001';
  j_id UUID;
  i_id UUID;
  p_id UUID;
  d_id UUID;
BEGIN
  FOR emp IN SELECT * FROM employer_profiles LOOP
    -- Insert Full Time Job
    j_id := gen_random_uuid();
    INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status)
    VALUES (j_id, emp.id, emp.company_name || ' Software Engineer', 'Full time software engineer role.', 'full_time', 'Engineering', ARRAY['Bangalore'], 1000000, 1500000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2026, ARRAY['Java', 'Python', 'React'], 10, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (j_id, col1);

    -- Insert Internship
    i_id := gen_random_uuid();
    INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status)
    VALUES (i_id, emp.id, emp.company_name || ' Summer Intern', 'Summer internship program.', 'internship', 'Engineering', ARRAY['Bangalore'], 50000, 80000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2026, ARRAY['Java', 'Python'], 5, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (i_id, col1);

    -- Insert Project
    p_id := gen_random_uuid();
    INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status)
    VALUES (p_id, emp.id, emp.company_name || ' Short Project', 'Short project opportunity.', 'short_project', 'Engineering', ARRAY['Remote'], 20000, 30000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2026, ARRAY['React', 'Node'], 5, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (p_id, col1);

    -- Insert Drive
    d_id := gen_random_uuid();
    INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count)
    VALUES (d_id, col1, emp.id, j_id, emp.company_name || ' Campus Drive', 'Annual campus placement drive.', 'on_campus', '2026-09-20', '09:00', '17:00', 'Virtual', 'scheduled', 100, 0);

  END LOOP;
END $$;

-- After migration 045: ensure seeded accounts can sign in (email verification gate)
UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE email_verified_at IS NULL;

-- Marketplace catalog (keep demo providers/services after seed resets)
INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active) VALUES
('CampusApt Prep', 'aptitude_tests', 'Campus-ready aptitude and analytical assessments',
 'Standardized aptitude batteries for placement seasons — numerical, logical, and verbal modules with campus batch scheduling.',
 'https://example.com/campusapt', 'partners@campusapt.example', true),
('CodeForge Assess', 'coding_assessments', 'Timed coding rounds for campus hiring',
 'Online coding assessments with language packs, plagiarism signals, and CSV score export for PlacementHub hiring results.',
 'https://example.com/codeforge', 'campus@codeforge.example', true),
('ProctorShield', 'proctoring', 'Secure online exam proctoring',
 'Browser lockdown, identity checks, and live/AI invigilation windows for remote aptitude and coding rounds.',
 'https://example.com/proctorshield', 'sales@proctorshield.example', true),
('PlacementReady Academy', 'training', 'Pre-placement prep cohorts',
 'Aptitude brush-up, resume workshops, and mock interview packs scheduled around campus drive calendars.',
 'https://example.com/placementready', 'hello@placementready.example', true),
('CareerLink Advisors', 'career_services', 'Employer branding and campus career booths',
 'On-campus career fair booths, employer brand sessions, and student mentoring hours for partner companies.',
 'https://example.com/careerlink', 'partners@careerlink.example', true);

INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT p.id, v.title, v.description, v.price_inr, v.billing_unit,
       v.available_to_college, v.available_to_employer, true, v.sort_order
FROM marketplace_providers p
JOIN (VALUES
  ('CampusApt Prep', 'Batch Aptitude Assessment (300 seats)',
   'One campus cohort of up to 300 students. Includes online proctoring window coordination and score CSV export for PlacementHub assessment uploads.',
   45000.00, 'per_batch', true, true, 10),
  ('CampusApt Prep', 'Aptitude Retake Window (50 seats)',
   'Follow-up seat pack for absentees and retakes within 14 days of the primary batch.',
   12000.00, 'per_batch', true, false, 20),
  ('CodeForge Assess', 'Campus Coding Round (200 seats)',
   'Two-hour coding assessment with auto-scoring and rank export.',
   65000.00, 'per_batch', true, true, 10),
  ('CodeForge Assess', 'Employer Take-Home Pack',
   'Reusable take-home coding pack for employer shortlists — grading dashboard and plagiarism report.',
   28000.00, 'one_time', false, true, 20),
  ('ProctorShield', 'Live Proctoring Add-on (per student)',
   'Live + AI proctoring overlay for an existing aptitude or coding session.',
   150.00, 'per_student', true, true, 10),
  ('PlacementReady Academy', 'Pre-Placement Bootcamp (weekend)',
   'Saturday–Sunday aptitude + soft-skills cohort for final-year students.',
   95000.00, 'per_batch', true, false, 10),
  ('CareerLink Advisors', 'Campus Branding Day',
   'Half-day employer brand session with auditorium slot coordination and student RSVP list.',
   40000.00, 'one_time', true, true, 10)
) AS v(provider_name, title, description, price_inr, billing_unit, available_to_college, available_to_employer, sort_order)
  ON LOWER(p.name) = LOWER(v.provider_name);

