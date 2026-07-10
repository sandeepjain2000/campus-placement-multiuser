-- Persistent employer offer letter templates + generated letter storage on offers

CREATE TABLE IF NOT EXISTS employer_offer_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    location VARCHAR(255),
    joining_date DATE,
    response_deadline DATE,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_offer_templates_employer
    ON employer_offer_templates (employer_id);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_template_id UUID
    REFERENCES employer_offer_templates(id) ON DELETE SET NULL;

ALTER TABLE offers ADD COLUMN IF NOT EXISTS rendered_letter_html TEXT;

CREATE INDEX IF NOT EXISTS idx_offers_drive_employer_student
    ON offers (drive_id, employer_id, student_id);
