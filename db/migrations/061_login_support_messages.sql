-- Pre-login support messages (sandbox fallback when SMTP is not configured)
CREATE TABLE IF NOT EXISTS login_support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reply_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    inbox_email TEXT,
    delivery_mode VARCHAR(20) NOT NULL DEFAULT 'stored'
        CHECK (delivery_mode IN ('smtp', 'stored', 'skipped', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_login_support_messages_created
    ON login_support_messages (created_at DESC);
