-- Append-only log of outbound email attempts (success, skip, or failure after SMTP try).
CREATE TABLE IF NOT EXISTS mail_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context VARCHAR(80),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
    skip_reason VARCHAR(80),
    original_to TEXT,
    resolved_to TEXT,
    subject_truncated VARCHAR(500),
    error_message TEXT,
    error_code VARCHAR(100),
    message_id TEXT,
    smtp_response TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_created ON mail_delivery_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_status ON mail_delivery_logs (status);
CREATE INDEX IF NOT EXISTS idx_mail_delivery_logs_context ON mail_delivery_logs (context);
