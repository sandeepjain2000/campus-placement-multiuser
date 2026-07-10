-- Richer outbound email audit: recipient identity survives account deletion;
-- separate communication routing from final SMTP destination.

ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS after_communication_to TEXT;
ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS recipient_login_email VARCHAR(255);
ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS recipient_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE mail_delivery_logs ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_recipient_user
  ON mail_delivery_logs (recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_recipient_login
  ON mail_delivery_logs (LOWER(recipient_login_email));

-- Backfill recipient_login_email from original_to where possible
UPDATE mail_delivery_logs
SET recipient_login_email = LOWER(
  TRIM(
    REGEXP_REPLACE(
      SPLIT_PART(COALESCE(original_to, ''), ',', 1),
      '^.*<([^>]+)>$',
      '\1'
    )
  )
)
WHERE recipient_login_email IS NULL
  AND original_to IS NOT NULL
  AND TRIM(original_to) <> '';

-- Link historical rows to users still in DB
UPDATE mail_delivery_logs m
SET
  recipient_user_id = u.id,
  recipient_login_email = LOWER(u.email),
  recipient_role = u.role,
  recipient_tenant_id = u.tenant_id,
  recipient_name = NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '')
FROM users u
WHERE m.recipient_user_id IS NULL
  AND m.recipient_login_email IS NOT NULL
  AND LOWER(u.email) = m.recipient_login_email;

UPDATE mail_delivery_logs m
SET
  recipient_user_id = u.id,
  recipient_login_email = LOWER(u.email),
  recipient_role = u.role,
  recipient_tenant_id = u.tenant_id,
  recipient_name = NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '')
FROM users u
WHERE m.recipient_user_id IS NULL
  AND m.recipient_login_email IS NOT NULL
  AND LOWER(NULLIF(TRIM(u.communication_email), '')) = m.recipient_login_email;

-- When routing did not change the address, after_communication matches original
UPDATE mail_delivery_logs
SET after_communication_to = resolved_to
WHERE after_communication_to IS NULL
  AND resolved_to IS NOT NULL;
