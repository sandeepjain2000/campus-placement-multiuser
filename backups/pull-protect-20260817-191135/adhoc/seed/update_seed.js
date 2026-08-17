const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const fs = require('fs');
const path = './db/seed.sql';

let data = fs.readFileSync(path, 'utf8');

// Admins
data = data.replace(
  "('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'admin@nitt.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'college_admin', 'Priya', 'Sharma', true, true);",
  "('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'admin@nitt.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'college_admin', 'Priya', 'Sharma', true, true),\n('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003', 'admin@bits.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'college_admin', 'Suresh', 'Rao', true, true);"
);

// Employers Users
data = data.replace(
  "('b1000000-0000-0000-0000-000000000006', 'hr@infosys.com', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'employer', 'Meera', 'Nair', true, true);",
  "('b1000000-0000-0000-0000-000000000006', 'hr@infosys.com', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'employer', 'Meera', 'Nair', true, true),\n('b1000000-0000-0000-0000-000000000013', 'hr@academic.nitt.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'employer', 'NITT', 'Academic Affairs', true, true),\n('b1000000-0000-0000-0000-000000000014', 'hr@alumni.bits.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'employer', 'BITS', 'Alumni Association', true, true);"
);

// Students Users
data = data.replace(
  "('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'amit.sharma@iitm.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'student', 'Amit', 'Sharma', true, true);",
  "('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'amit.sharma@iitm.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'student', 'Amit', 'Sharma', true, true),\n('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000002', 'sneha.rao@nitt.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'student', 'Sneha', 'Rao', true, true),\n('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003', 'rohan.mehta@bits.edu', '$2a$10$rQEY0tLx6Fy1JXqFVUxWOeZk5JGqV0IV2Ld6X5MOLyVCfYl1GKHWK', 'student', 'Rohan', 'Mehta', true, true);"
);

// College Settings
data = data.replace(
  "('a1000000-0000-0000-0000-000000000002', 1, 5, 6.5, '2026-08-01', '2027-05-31');",
  "('a1000000-0000-0000-0000-000000000002', 1, 5, 6.5, '2026-08-01', '2027-05-31'),\n('a1000000-0000-0000-0000-000000000003', 2, 7, 6.0, '2026-08-01', '2027-05-31');"
);

// Employer Profiles
data = data.replace(
  "('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'Infosys Limited', 'infosys', 'Information Technology', 'mnc', '10000+', 'https://infosys.com', 'Global leader in next-generation digital services and consulting.', 'Bangalore, India', ARRAY['Bangalore', 'Mysuru', 'Pune', 'Hyderabad', 'Chennai']);",
  "('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'Infosys Limited', 'infosys', 'Information Technology', 'mnc', '10000+', 'https://infosys.com', 'Global leader in next-generation digital services and consulting.', 'Bangalore, India', ARRAY['Bangalore', 'Mysuru', 'Pune', 'Hyderabad', 'Chennai']),\n('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000013', 'NIT Trichy Academic Affairs', 'nitt-academic', 'Education', 'government', '1000-5000', 'https://nitt.edu', 'Academic hiring and guest faculty management for NIT Trichy.', 'Trichy, India', ARRAY['Trichy']),\n('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000014', 'BITS Alumni Association', 'bits-alumni', 'Education', 'ngo', '10000+', 'https://bits-alumni.org', 'Connecting current students with established alumni for mentorship and guidance.', 'Pilani, India', ARRAY['Pilani']);"
);

// Student Profiles
data = data.replace(
  "('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'ME2021001', 'Mechanical', 'Mechanical Engineering', 2021, 2025, 7.20, 85.0, 82.0, 'male', 'unplaced', true, 'Interested in product design and manufacturing automation.');",
  "('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'ME2021001', 'Mechanical', 'Mechanical Engineering', 2021, 2025, 7.20, 85.0, 82.0, 'male', 'unplaced', true, 'Interested in product design and manufacturing automation.'),\n('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000002', 'CS2021101', 'Computer Science', 'Computer Science & Engineering', 2021, 2025, 8.90, 95.0, 92.5, 'female', 'unplaced', true, 'Full stack developer with passion for building scalable web applications.'),\n('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003', 'CS2021201', 'Computer Science', 'Computer Science & Engineering', 2021, 2025, 9.20, 98.0, 96.0, 'male', 'unplaced', true, 'AI/ML enthusiast. Working on deep learning applications and research.');"
);

// Job Postings
data = data.replace(
  "50, 'published');",
  "50, 'published'),\n('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'TechCorp Innovations Hackathon', 'Join the largest coding hackathon. Build innovative solutions using GenAI and win amazing prizes + PPO opportunities.', 'hackathon', 'Engineering', ARRAY['Virtual'], 0, 0, ARRAY['Computer Science & Engineering', 'Information Technology'], 0.0, 0, 2025, ARRAY['Problem Solving', 'Coding'], 100, 'published'),\n('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002', 'GlobalSoft Summer Project', 'Short term summer project on modernizing legacy systems using microservices architecture.', 'short_project', 'Engineering', ARRAY['Remote'], 20000, 30000, ARRAY['Computer Science & Engineering'], 7.0, 0, 2025, ARRAY['Java', 'Spring Boot', 'Microservices'], 10, 'published'),\n('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000005', 'Alumni Mentorship Program 2026', 'Get paired with senior industry leaders who are alumni of BITS Pilani for a 6-month mentorship covering career guidance, interview prep, and networking.', 'mentorship', 'Career Growth', ARRAY['Virtual'], 0, 0, ARRAY['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering'], 0.0, 0, 2025, ARRAY['Communication', 'Leadership'], 50, 'published'),\n('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'Guest Faculty in AI/ML', 'Looking for industry experts to conduct a 2-week workshop on Advanced Machine Learning and Neural Networks for pre-final year students.', 'guest_faculty', 'Education', ARRAY['Trichy'], 100000, 150000, ARRAY['Computer Science & Engineering'], 0.0, 0, 0, ARRAY['AI/ML', 'Teaching', 'Industry Experience'], 2, 'published');"
);

fs.writeFileSync(path, data);
console.log('Seed file updated successfully');
