const fs = require('fs');
const path = './db/seed.sql';

let sql = fs.readFileSync(path, 'utf8');

if (sql.includes('-- APPENDIX: TCS and Extended Tie-ups')) {
  console.log('Seed file already patched.');
  process.exit(0);
}

const appendix = `
-- APPENDIX: TCS and Extended Tie-ups

-- 1. Add TCS
INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, is_verified) VALUES
('b1000000-0000-0000-0000-000000000022', 'hr@tcs.com', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'employer', 'TCS', 'HR', true, true);

INSERT INTO employer_profiles (id, user_id, company_name, company_slug, industry, company_type, company_size, founded_year, website, logo_url, description, headquarters, locations) VALUES
('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000022', 'Tata Consultancy Services (TCS)', 'tcs', 'Information Technology', 'mnc', '10000+', 1968, 'https://www.tcs.com', '/logos/seed-tcs.svg', 'Global leader in IT services, consulting, and business solutions.', 'Mumbai, India', ARRAY['Mumbai', 'Pune', 'Bangalore', 'Chennai', 'Hyderabad']);

-- 2. Add second student to BITS Pilani
INSERT INTO users (id, tenant_id, email, password_hash, role, first_name, last_name, is_active, is_verified, phone) VALUES
('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000003', 'priya.singh@bits.edu', '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', 'student', 'Priya', 'Singh', true, true, '+919800100023');

INSERT INTO student_profiles (user_id, tenant_id, roll_number, enrollment_number, department, branch, batch_year, graduation_year, cgpa, tenth_percentage, twelfth_percentage, gender, placement_status, is_verified, verified_at, bio, resume_url) VALUES
('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000003', 'EC2021202', 'ENR-BITS-EC2021202', 'Electronics', 'Electronics & Communication', 2021, 2025, 8.85, 96.0, 94.0, 'female', 'unplaced', true, NOW(), 'Passionate about embedded systems.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

-- 3. Tie up EVERY employer to IITM and NITT
DELETE FROM employer_approvals;
INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at)
SELECT t.id, e.id, 'approved', 'b1000000-0000-0000-0000-000000000002', NOW(), NOW()
FROM tenants t, employer_profiles e
WHERE t.id IN ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');

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
    VALUES (j_id, emp.id, emp.company_name || ' Software Engineer', 'Full time software engineer role.', 'full_time', 'Engineering', ARRAY['Bangalore'], 1000000, 1500000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2025, ARRAY['Java', 'Python', 'React'], 10, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (j_id, col1);

    -- Insert Internship
    i_id := gen_random_uuid();
    INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status)
    VALUES (i_id, emp.id, emp.company_name || ' Summer Intern', 'Summer internship program.', 'internship', 'Engineering', ARRAY['Bangalore'], 50000, 80000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2025, ARRAY['Java', 'Python'], 5, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (i_id, col1);

    -- Insert Project
    p_id := gen_random_uuid();
    INSERT INTO job_postings (id, employer_id, title, description, job_type, category, locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year, skills_required, vacancies, status)
    VALUES (p_id, emp.id, emp.company_name || ' Short Project', 'Short project opportunity.', 'short_project', 'Engineering', ARRAY['Remote'], 20000, 30000, ARRAY['Computer Science & Engineering', 'Electronics & Communication'], 7.0, 0, 2025, ARRAY['React', 'Node'], 5, 'published');
    INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES (p_id, col1);

    -- Insert Drive
    d_id := gen_random_uuid();
    INSERT INTO placement_drives (id, tenant_id, employer_id, job_id, title, description, drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count)
    VALUES (d_id, col1, emp.id, j_id, emp.company_name || ' Campus Drive', 'Annual campus placement drive.', 'on_campus', '2026-09-20', '09:00', '17:00', 'Virtual', 'scheduled', 100, 0);

  END LOOP;
END $$;
`;

fs.writeFileSync(path, sql + '\n' + appendix);
console.log('Successfully appended dynamic seed data to db/seed.sql');
