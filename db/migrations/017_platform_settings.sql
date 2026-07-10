-- Global platform configuration for super admin (SMTP, system notification inbox, etc.)
-- Super admin users often have no tenant_id; settings live here instead of tenants.settings.

CREATE TABLE IF NOT EXISTS platform_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (id, settings) VALUES (
  1,
  '{
    "platformName": "PlacementHub",
    "supportEmail": "placementhub@yopmail.com",
    "systemNotificationInboxEmail": "placementhub@yopmail.com",
    "systemNotificationWebmailUrl": "https://yopmail.com/wm",
    "systemNotificationSenderName": "placementhub",
    "timezone": "Asia/Kolkata",
    "requireEmailVerification": true,
    "enableTwoFactorAuth": false,
    "sessionTimeoutValue": 24,
    "sessionTimeoutUnit": "hours",
    "rememberDeviceValue": 14,
    "rememberDeviceUnit": "days",
    "smtpHost": "",
    "smtpPort": 587,
    "fromEmail": "",
    "storageProvider": "Local Filesystem",
    "maxUploadSizeMb": 5
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Restore standard seed super admin login (Admin@123) if a prior test migration changed it
UPDATE users
SET
  email = 'admin@placementhub.com',
  password_hash = '$2b$10$ltqrYuTkwv8DSRWH/v5kyeuL2KX7OX8IwqYect/Bbp/8kZOXcVp82',
  updated_at = NOW()
WHERE id = 'b1000000-0000-0000-0000-000000000001';
