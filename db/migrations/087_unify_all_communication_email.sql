-- Unify all communication_email delivery addresses (users + tenants).
-- Login emails (users.email, tenants.email) are unchanged.

UPDATE users
SET communication_email = 'sandeepjain200019@gmail.com',
    updated_at = NOW();

UPDATE tenants
SET communication_email = 'sandeepjain200019@gmail.com',
    updated_at = NOW();
