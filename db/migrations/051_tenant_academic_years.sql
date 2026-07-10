-- Academic years and semesters per college tenant; event linkage.

CREATE TABLE tenant_academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label VARCHAR(16) NOT NULL,
  sequence_number INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  semester_count INTEGER NOT NULL DEFAULT 2 CHECK (semester_count BETWEEN 1 AND 3),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tenant_academic_years_label_chk CHECK (
    label ~ '^\d{4}$' OR label ~ '^\d{4}-\d{2}$'
  ),
  UNIQUE (tenant_id, label),
  UNIQUE (tenant_id, sequence_number)
);

CREATE INDEX idx_tenant_academic_years_tenant ON tenant_academic_years(tenant_id);
CREATE INDEX idx_tenant_academic_years_period ON tenant_academic_years(tenant_id, period_start, period_end);

CREATE TABLE tenant_academic_year_semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES tenant_academic_years(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK (sequence_number BETWEEN 1 AND 3),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (academic_year_id, sequence_number)
);

CREATE INDEX idx_tenant_ay_semesters_year ON tenant_academic_year_semesters(academic_year_id);

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES tenant_academic_years(id) ON DELETE SET NULL;

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES tenant_academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_placement_drives_academic_year ON placement_drives(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_academic_year ON job_postings(academic_year_id);

-- Demo: IIT Madras academic years (2 semesters each)
INSERT INTO tenant_academic_years (id, tenant_id, label, sequence_number, period_start, period_end, semester_count)
VALUES
  ('d1000000-0000-0000-0000-000000000202', 'a1000000-0000-0000-0000-000000000001', '2025-26', 1, '2026-01-01', '2026-06-30', 2),
  ('d1000000-0000-0000-0000-000000000203', 'a1000000-0000-0000-0000-000000000001', '2026-27', 2, '2026-07-01', '2027-06-30', 2)
ON CONFLICT (tenant_id, label) DO NOTHING;

INSERT INTO tenant_academic_year_semesters (academic_year_id, sequence_number, period_start, period_end)
SELECT y.id, s.seq, s.p_start, s.p_end
FROM tenant_academic_years y
JOIN (VALUES
  ('2025-26', 1, '2026-01-01'::date, '2026-03-31'::date),
  ('2025-26', 2, '2026-04-01'::date, '2026-06-30'::date),
  ('2026-27', 1, '2026-07-01'::date, '2026-12-31'::date),
  ('2026-27', 2, '2027-01-01'::date, '2027-06-30'::date)
) AS s(lbl, seq, p_start, p_end) ON y.label = s.lbl AND y.tenant_id = 'a1000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (academic_year_id, sequence_number) DO NOTHING;

-- Backfill drive academic year from drive_date where possible
UPDATE placement_drives d
SET academic_year_id = y.id
FROM tenant_academic_years y
WHERE d.tenant_id = y.tenant_id
  AND d.drive_date IS NOT NULL
  AND d.drive_date >= y.period_start
  AND d.drive_date <= y.period_end
  AND d.academic_year_id IS NULL;
