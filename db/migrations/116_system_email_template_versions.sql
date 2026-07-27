-- System email template version history (baseline + later platform publishes).
-- Lets colleges/employers undo campus overrides by restoring a prior system version.

BEGIN;

CREATE TABLE IF NOT EXISTS system_email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(64) NOT NULL,
  version_number INTEGER NOT NULL,
  label VARCHAR(120),
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_system_email_tpl_version UNIQUE (template_key, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_email_tpl_baseline
  ON system_email_template_versions (template_key)
  WHERE is_baseline = true;

CREATE INDEX IF NOT EXISTS idx_system_email_tpl_versions_key
  ON system_email_template_versions (template_key, version_number DESC);

COMMENT ON TABLE system_email_template_versions IS
  'Immutable snapshots of platform system_email_templates. Baseline (v1) is retained; each admin publish adds a new version.';

-- Seed baseline (v1) from current live platform templates when missing.
INSERT INTO system_email_template_versions (
  template_key, version_number, label, subject_template, body_template, is_baseline, created_at, created_by
)
SELECT
  t.template_key,
  1,
  'Baseline',
  t.subject_template,
  t.body_template,
  true,
  COALESCE(t.updated_at, NOW()),
  t.updated_by
FROM system_email_templates t
WHERE NOT EXISTS (
  SELECT 1 FROM system_email_template_versions v WHERE v.template_key = t.template_key
);

COMMIT;
