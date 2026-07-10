-- Star / favorite alerts (inbox starred mailbox).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notif_user_starred ON notifications (user_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_starred = true;
