-- Soft-delete for in-app notifications (inbox vs trash on Alerts page).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_notif_user_trash ON notifications (user_id, created_at DESC)
  WHERE deleted_at IS NOT NULL;
