-- Synced from db/migrations/002_platform_feedback.sql (idempotent).

CREATE TABLE IF NOT EXISTS platform_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Submitted'
        CHECK (status IN ('Submitted', 'Under Review', 'Planned', 'Closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_user ON platform_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status ON platform_feedback(status);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_created ON platform_feedback(created_at DESC);
