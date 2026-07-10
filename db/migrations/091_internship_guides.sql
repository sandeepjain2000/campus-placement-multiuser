-- Campus-assigned faculty / TPO guide for each intern (one per program application).

CREATE TABLE IF NOT EXISTS internship_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_application_id UUID NOT NULL REFERENCES program_applications(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    guide_name VARCHAR(120) NOT NULL,
    guide_email VARCHAR(255),
    guide_phone VARCHAR(30),
    guide_department VARCHAR(120),
    guide_notes TEXT,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_application_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_guides_tenant
    ON internship_guides (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_internship_guides_student
    ON internship_guides (student_profile_id);
