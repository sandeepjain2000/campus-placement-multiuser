-- Per-employer / per-college overrides for system_email_templates (multi-tenant copy)
CREATE TABLE IF NOT EXISTS email_template_overrides (
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('employer', 'college')),
    scope_id UUID NOT NULL,
    template_key VARCHAR(64) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (scope_type, scope_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_email_tpl_override_scope ON email_template_overrides (scope_type, scope_id);
