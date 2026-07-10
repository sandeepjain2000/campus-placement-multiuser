-- Company-side supervisor for each intern (one per program application).

CREATE TABLE IF NOT EXISTS internship_supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_application_id UUID NOT NULL REFERENCES program_applications(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    supervisor_name VARCHAR(120) NOT NULL,
    supervisor_email VARCHAR(255),
    supervisor_phone VARCHAR(30),
    supervisor_team VARCHAR(120),
    supervisor_notes TEXT,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_application_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_supervisors_employer
    ON internship_supervisors (employer_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_internship_supervisors_tenant
    ON internship_supervisors (tenant_id);
