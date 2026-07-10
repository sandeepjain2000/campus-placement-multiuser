-- Replace legacy "Student IITM-BULK-0001" display names with realistic names (idempotent).
-- Run: npm run db:exec-sql-file -- db/migrations/054_iitm_bulk_student_realistic_names.sql

DO $$
DECLARE
  r RECORD;
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
  bulk_idx INT;
  first_idx INT;
  last_idx INT;
BEGIN
  FOR r IN
    SELECT u.id AS user_id, sp.roll_number, u.first_name, u.last_name
    FROM users u
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE sp.roll_number ~ '^IITM-BULK-[0-9]+$'
  LOOP
    bulk_idx := NULLIF(substring(r.roll_number FROM 'IITM-BULK-([0-9]+)'), '')::INT;
    IF bulk_idx IS NULL THEN
      CONTINUE;
    END IF;

    IF r.first_name = 'Student'
       OR r.last_name = r.roll_number
       OR r.last_name ~ '^IITM-BULK-[0-9]+$' THEN
      first_idx := 1 + ((bulk_idx - 1) % array_length(first_names, 1));
      last_idx := 1 + ((((bulk_idx - 1) * 3) + ((bulk_idx - 1) / array_length(first_names, 1))) % array_length(last_names, 1));

      UPDATE users
      SET first_name = first_names[first_idx],
          last_name = last_names[last_idx],
          updated_at = NOW()
      WHERE id = r.user_id;
    END IF;
  END LOOP;
END $$;
