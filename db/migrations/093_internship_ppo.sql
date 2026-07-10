-- Pre-Placement Offer (PPO) for internship program applications — separate from internship selection and formal job offer.

CREATE TABLE IF NOT EXISTS internship_ppo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_application_id UUID NOT NULL REFERENCES program_applications(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_student'
        CHECK (status IN ('pending_student', 'accepted', 'declined', 'revoked')),
    employer_notes TEXT,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    student_responded_at TIMESTAMPTZ,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_application_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_ppo_employer
    ON internship_ppo (employer_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_internship_ppo_tenant
    ON internship_ppo (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_internship_ppo_student
    ON internship_ppo (student_profile_id);

ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS program_application_id UUID REFERENCES program_applications(id) ON DELETE SET NULL;

ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS offer_kind VARCHAR(30) NOT NULL DEFAULT 'standard'
        CHECK (offer_kind IN ('standard', 'ppo_job'));

CREATE INDEX IF NOT EXISTS idx_offers_program_application
    ON offers (program_application_id)
    WHERE program_application_id IS NOT NULL;
