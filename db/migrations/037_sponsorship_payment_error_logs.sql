-- Persist sponsorship payment API failures for debugging (schema drift, constraints, etc.)

CREATE TABLE IF NOT EXISTS sponsorship_payment_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  opportunity_id UUID,
  method VARCHAR(24),
  error_code TEXT,
  error_message TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_payment_err_created
  ON sponsorship_payment_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorship_payment_err_user
  ON sponsorship_payment_error_logs (user_id, created_at DESC);
