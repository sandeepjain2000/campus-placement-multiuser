-- Allow drive/offer/application notification types (used by placement drive requests, etc.).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'success', 'warning', 'error', 'drive', 'offer', 'application'));
