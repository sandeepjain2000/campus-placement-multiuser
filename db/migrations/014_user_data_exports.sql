-- Per-user full data exports (audit trail of download requests).

CREATE TABLE IF NOT EXISTS user_data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  format VARCHAR(16) NOT NULL DEFAULT 'json',
  byte_size INTEGER,
  section_summary JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_data_exports_user_created ON user_data_exports(user_id, created_at DESC);
