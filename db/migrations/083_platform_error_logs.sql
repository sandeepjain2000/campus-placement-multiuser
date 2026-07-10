-- Platform error logs for super-admin diagnostics (API failures, etc.).
CREATE TABLE IF NOT EXISTS platform_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity VARCHAR(20) NOT NULL DEFAULT 'error'
    CHECK (severity IN ('info', 'warning', 'error')),
  context VARCHAR(80) NOT NULL,
  status_code INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES employer_profiles(id) ON DELETE SET NULL,
  user_message TEXT,
  error_message TEXT NOT NULL,
  error_code VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_platform_error_logs_created ON platform_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_error_logs_context ON platform_error_logs (context);
CREATE INDEX IF NOT EXISTS idx_platform_error_logs_status ON platform_error_logs (status_code);
