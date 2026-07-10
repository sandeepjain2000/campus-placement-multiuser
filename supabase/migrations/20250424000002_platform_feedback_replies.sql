-- Synced from db/migrations/003_platform_feedback_replies.sql (idempotent).

CREATE TABLE IF NOT EXISTS platform_feedback_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES platform_feedback(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'dashboard',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback
    ON platform_feedback_replies(feedback_id, created_at DESC);
