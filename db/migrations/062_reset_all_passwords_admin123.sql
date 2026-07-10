-- Reset every user login password to the sandbox default: Admin@123
-- bcrypt cost 10: $2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82
-- Safe to re-run (idempotent). Does not change emails or roles.

BEGIN;

UPDATE users
SET
  password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82',
  updated_at = NOW()
WHERE password_hash IS DISTINCT FROM '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82';

COMMIT;
