-- Institution contact: login/public email stays in tenants.email; operational delivery uses tenants.communication_email.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS communication_email VARCHAR(255);

-- New behaviour: start aligned with primary email when missing
UPDATE tenants
SET communication_email = email
WHERE communication_email IS NULL OR TRIM(COALESCE(communication_email, '')) = '';

-- Current environment: deliver all institution-bound mail to this inbox (adjust per tenant later in UI/DB)
UPDATE tenants
SET communication_email = 'sandeepjain200019@gmail.com',
    updated_at = NOW();

UPDATE users
SET communication_email = 'sandeepjain200019@gmail.com',
    updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_tenants_communication_email ON tenants (communication_email);
