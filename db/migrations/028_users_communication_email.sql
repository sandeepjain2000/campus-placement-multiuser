-- Login email stays in users.email (unique). Communication email can differ (notifications, exports, templates).
ALTER TABLE users ADD COLUMN IF NOT EXISTS communication_email VARCHAR(255);

UPDATE users
SET communication_email = email
WHERE communication_email IS NULL OR TRIM(COALESCE(communication_email, '')) = '';

-- Dev convenience: unify all seeded / existing accounts to one inbox for testing
UPDATE users
SET communication_email = 'sandeepjain200019@gmail.com',
    updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_users_communication_email ON users (communication_email);
