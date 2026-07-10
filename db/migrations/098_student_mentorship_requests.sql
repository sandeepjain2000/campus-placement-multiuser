-- Student-initiated informal mentorship: post → college approve → employer volunteer.

CREATE TABLE IF NOT EXISTS student_mentorship_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    topics TEXT,
    preferred_format TEXT,
    time_hint TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'closed')),
    college_note TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_mentorship_requests_tenant
    ON student_mentorship_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_mentorship_requests_student
    ON student_mentorship_requests (student_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_mentorship_requests_status
    ON student_mentorship_requests (tenant_id, status);

CREATE TABLE IF NOT EXISTS student_mentorship_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES student_mentorship_requests(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    employer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    volunteered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_student_mentorship_volunteers_request
    ON student_mentorship_volunteers (request_id);
CREATE INDEX IF NOT EXISTS idx_student_mentorship_volunteers_employer
    ON student_mentorship_volunteers (employer_id);
