-- Post-internship feedback from students and employers, visible to college TPO.

CREATE TABLE IF NOT EXISTS internship_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_application_id UUID NOT NULL REFERENCES program_applications(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE SET NULL,
    author_role VARCHAR(20) NOT NULL CHECK (author_role IN ('student', 'employer')),
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_application_id, author_role)
);

CREATE INDEX IF NOT EXISTS idx_internship_feedback_tenant
    ON internship_feedback (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internship_feedback_job
    ON internship_feedback (job_id);

CREATE INDEX IF NOT EXISTS idx_internship_feedback_employer
    ON internship_feedback (employer_id);
