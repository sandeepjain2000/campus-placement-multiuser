-- Undo 015-style email mangling for seeded UUIDs and reset passwords to the seed default.
-- Seed password for all rows below: Admin@123
-- bcrypt: $2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82
--
-- Super admin uses standard seed login admin@placementhub.com (Admin@123).
-- System notification email is configured in platform_settings (see migration 017), not as login email.

BEGIN;

UPDATE users SET email = 'admin@placementhub.com', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000001';

UPDATE users SET email = 'admin@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000002';

UPDATE users SET email = 'admin@nitt.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000003';

UPDATE users SET email = 'hr@techcorp.com', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000004';

UPDATE users SET email = 'hr@globalsoft.com', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000005';

UPDATE users SET email = 'hr@infosys.com', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000006';

UPDATE users SET email = 'arjun.verma@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000007';

UPDATE users SET email = 'sneha.iyer@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000008';

UPDATE users SET email = 'rohan.patel@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000009';

UPDATE users SET email = 'kavya.reddy@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000010';

UPDATE users SET email = 'amit.sharma@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000011';

UPDATE users SET email = 'admin@bits.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000012';

UPDATE users SET email = 'hr@academic.nitt.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000013';

UPDATE users SET email = 'hr@alumni.bits.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000014';

UPDATE users SET email = 'sneha.rao@nitt.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000015';

UPDATE users SET email = 'rohan.mehta@bits.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000016';

UPDATE users SET email = 'committee@iitm.edu', password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82', updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000017';

-- Restore tenant contact emails from seed (main three colleges)
UPDATE tenants SET email = 'placement@iitm.edu', updated_at = NOW()
WHERE id = 'a1000000-0000-0000-0000-000000000001';

UPDATE tenants SET email = 'placement@nitt.edu', updated_at = NOW()
WHERE id = 'a1000000-0000-0000-0000-000000000002';

UPDATE tenants SET email = 'placement@bits.edu', updated_at = NOW()
WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- Employer profile contact_email was optional in seed; clear forced test value
UPDATE employer_profiles SET contact_email = NULL, updated_at = NOW()
WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000006',
  'b1000000-0000-0000-0000-000000000013',
  'b1000000-0000-0000-0000-000000000014'
);

COMMIT;
