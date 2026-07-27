-- Dedicated ZeptoMail request_id on outbound mail delivery logs.

BEGIN;

ALTER TABLE mail_delivery_logs
  ADD COLUMN IF NOT EXISTS zeptomail_request_id VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_zepto_request
  ON mail_delivery_logs (zeptomail_request_id)
  WHERE zeptomail_request_id IS NOT NULL;

COMMENT ON COLUMN mail_delivery_logs.zeptomail_request_id IS
  'ZeptoMail API request_id from successful (or failed) transactional send responses.';

COMMIT;
