-- Per-student batch overrides for May–Jun rollover (failed / repeat-year students).

CREATE TABLE IF NOT EXISTS tenant_semester_rollover_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  academic_year_label VARCHAR(16) NOT NULL,
  semester_in_year INTEGER NOT NULL CHECK (semester_in_year BETWEEN 1 AND 3),
  repeat_year BOOLEAN NOT NULL DEFAULT false,
  new_batch_year INTEGER,
  new_graduation_year INTEGER,
  notes TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, student_id, academic_year_label, semester_in_year)
);

CREATE INDEX IF NOT EXISTS idx_tenant_rollover_adj_tenant
  ON tenant_semester_rollover_adjustments (tenant_id, academic_year_label, semester_in_year);

COMMENT ON TABLE tenant_semester_rollover_adjustments IS
  'College-entered batch changes for failed students before semester rollover runs.';
