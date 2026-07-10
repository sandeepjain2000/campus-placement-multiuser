-- System-wide editable email templates (Super Admin)
CREATE TABLE IF NOT EXISTS system_email_templates (
    template_key VARCHAR(64) PRIMARY KEY,
    description TEXT,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Employer confirmation emails to colleges for campus guest needs
CREATE TABLE IF NOT EXISTS campus_guest_confirmation_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES campus_engagement_listings(id) ON DELETE CASCADE,
    employer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, employer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_guest_conf_listing ON campus_guest_confirmation_sends (listing_id);
CREATE INDEX IF NOT EXISTS idx_campus_guest_conf_employer ON campus_guest_confirmation_sends (employer_user_id);

INSERT INTO system_email_templates (template_key, description, subject_template, body_template)
VALUES (
    'campus_guest_confirmation',
    'Email sent when an employer confirms interest in a published campus guest faculty / lecture listing. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{listingTitle}}, {{listingKind}}, {{listingSummary}}, {{listingRequirements}}, {{timeHint}}, {{employerName}}, {{employerEmail}}, {{employerCompany}}',
    'Guest engagement interest: {{listingTitle}} — {{employerCompany}}',
    'Dear {{collegeName}} Placement Team,

We are writing regarding your published campus guest need.

Listing: {{listingTitle}}
Type: {{listingKind}}

Summary:
{{listingSummary}}

Requirements:
{{listingRequirements}}

Preferred timing: {{timeHint}}

—
From: {{employerName}}
Email: {{employerEmail}}
Organization: {{employerCompany}}

We confirm our interest and would like to discuss next steps at your convenience.

Best regards,
{{employerName}}
{{employerCompany}}'
)
ON CONFLICT (template_key) DO NOTHING;
