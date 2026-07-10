-- 100 demo students for Indian Institute of Technology, Madras (idempotent).
-- Run: node scripts/db_exec_sql_file.js db/migrations/050_iitm_100_students.sql

DO $$
DECLARE
  i INT;
  uid UUID;
  tenant_id UUID := 'a1000000-0000-0000-0000-000000000001';
  pass_hash TEXT := '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82';
  comm_email TEXT := 'sandeepjain200019@gmail.com';
  dept_names TEXT[] := ARRAY[
    'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical'
  ];
  branch_names TEXT[] := ARRAY[
    'Computer Science & Engineering',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering'
  ];
  first_names TEXT[] := ARRAY[
    'Arjun', 'Priya', 'Karthik', 'Ananya', 'Rohan', 'Meera', 'Aditya', 'Kavya', 'Vikram', 'Divya',
    'Sanjay', 'Lakshmi', 'Suresh', 'Nandini', 'Rajesh', 'Pooja', 'Arun', 'Shruti', 'Mohan', 'Deepa',
    'Ganesh', 'Revathi', 'Harish', 'Swetha', 'Pranav', 'Ishita', 'Nikhil', 'Aishwarya', 'Varun', 'Keerthi',
    'Rahul', 'Neha', 'Amit', 'Sneha', 'Vivek', 'Anjali', 'Manoj', 'Preeti', 'Ashok', 'Ritu',
    'Kiran', 'Tulsi', 'Devan', 'Yamini', 'Senthil', 'Malini', 'Gopal', 'Harini', 'Bijoy', 'Lata'
  ];
  last_names TEXT[] := ARRAY[
    'Verma', 'Sharma', 'Reddy', 'Iyer', 'Patel', 'Nair', 'Gupta', 'Rao', 'Singh', 'Krishnan',
    'Menon', 'Joshi', 'Desai', 'Mukherjee', 'Banerjee', 'Choudhury', 'Pillai', 'Hegde', 'Bhat', 'Chauhan',
    'Kapoor', 'Saxena', 'Agarwal', 'Malhotra', 'Khanna', 'Subramanian', 'Venkatesh', 'Ramachandran', 'Sundaram', 'Narayanan',
    'Gopalakrishnan', 'Balasubramanian', 'Srinivasan', 'Ranganathan', 'Mahadevan', 'Chandrasekhar', 'Thakur', 'Mishra', 'Pandey', 'Tiwari',
    'Dutta', 'Ghosh', 'Bose', 'Sen', 'Roy', 'Mehta', 'Shah', 'Kulkarni', 'Jadhav', 'Pawar'
  ];
  dept_idx INT;
  first_idx INT;
  last_idx INT;
  roll_no TEXT;
  email_addr TEXT;
  cgpa_val NUMERIC(4, 2);
  genders TEXT[] := ARRAY['male', 'female'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id) THEN
    RAISE EXCEPTION 'IIT Madras tenant not found — run base seed first';
  END IF;

  FOR i IN 1..100 LOOP
    uid := ('c3000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid;
    roll_no := 'IITM-BULK-' || lpad(i::text, 4, '0');
    email_addr := 'iitm.bulk' || lpad(i::text, 3, '0') || '@campus-placement.work';
    dept_idx := 1 + ((i - 1) % array_length(dept_names, 1));
    first_idx := 1 + ((i - 1) % array_length(first_names, 1));
    last_idx := 1 + ((((i - 1) * 3) + ((i - 1) / array_length(first_names, 1))) % array_length(last_names, 1));
    cgpa_val := round((6.0 + (random() * 3.4))::numeric, 2);

    INSERT INTO users (
      id, tenant_id, email, communication_email, password_hash, role,
      first_name, last_name, is_active, is_verified, email_verified_at
    ) VALUES (
      uid, tenant_id, email_addr, comm_email, pass_hash, 'student',
      first_names[first_idx], last_names[last_idx], true, true, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW();

    INSERT INTO student_profiles (
      user_id, tenant_id, roll_number, enrollment_number,
      department, branch, batch_year, graduation_year,
      cgpa, gender, category, placement_status, is_verified, verified_at
    ) VALUES (
      uid, tenant_id, roll_no, 'ENR-' || roll_no,
      dept_names[dept_idx], branch_names[dept_idx], 2026, 2026,
      cgpa_val, genders[1 + (i % 2)], 'General', 'unplaced', true, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      department = EXCLUDED.department,
      branch = EXCLUDED.branch,
      cgpa = EXCLUDED.cgpa,
      updated_at = NOW();
  END LOOP;

  UPDATE student_profiles
  SET aux_profile = COALESCE(aux_profile, '{}'::jsonb) || jsonb_build_object('degreePursued', 'B.Tech')
  WHERE roll_number LIKE 'IITM-BULK-%';

  UPDATE student_profiles
  SET branch = COALESCE(NULLIF(TRIM(branch), ''), NULLIF(TRIM(department), ''))
  WHERE roll_number LIKE 'IITM-BULK-%'
    AND NULLIF(TRIM(branch), '') IS NULL;
END $$;
