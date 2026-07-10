-- Previously all sendMail() calls were redirected to systemNotificationInboxEmail
-- (default placementhub@yopmail.com), so real recipients never saw messages.
-- Clear it so "To" is the actual recipient unless Super Admin sets an inbox again.
UPDATE platform_settings
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{systemNotificationInboxEmail}',
    to_jsonb(''::text),
    true
  ),
  updated_at = NOW()
WHERE id = 1;
