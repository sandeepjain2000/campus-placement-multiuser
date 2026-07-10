-- Scope published jobs to campuses the employer selected at publish time.
-- Student applications to internships / projects without placement_drives.
--
-- student_profiles.member_tenant_id is required by placement tenant resolution (see sessionTenant.js).
-- Idempotent; same column as db/migrations/004_group_tenants_student_affiliation.sql.

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS member_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_member_tenant ON student_profiles(member_tenant_id);

CREATE TABLE IF NOT EXISTS job_posting_visibility (
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (job_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_job_visibility_tenant ON job_posting_visibility(tenant_id);

CREATE TABLE IF NOT EXISTS program_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'applied'
        CHECK (status IN ('applied', 'shortlisted', 'in_progress', 'selected', 'rejected', 'withdrawn', 'on_hold')),
    notes TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_program_app_student ON program_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_program_app_job ON program_applications(job_id);
