-- Thank-you email to college after employer sponsorship (copy stored for future sends / employer reference)
INSERT INTO system_email_templates (template_key, description, subject_template, body_template)
VALUES (
    'sponsorship_thank_you',
    'Thank-you note from sponsor to the college for a sponsorship opportunity. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerName}}, {{employerEmail}}, {{employerCompany}}, {{sponsorshipTierName}}, {{sponsorshipCategory}}, {{amountInr}}, {{placementSeasonLabel}}',
    'Thank you — {{sponsorshipTierName}} partnership with {{collegeName}}',
    'Dear {{collegeName}} Team,

On behalf of {{employerCompany}}, we want to express our sincere thanks for partnering with us as a {{sponsorshipTierName}} under your {{sponsorshipCategory}} program ({{amountInr}}).

We value our relationship with {{collegeName}} — {{collegeCity}}, {{collegeState}} — and look forward to engaging with students and faculty during {{placementSeasonLabel}}.

Please reach us at {{employerEmail}} for any coordination.

Warm regards,
{{employerName}}
{{employerCompany}}'
)
ON CONFLICT (template_key) DO NOTHING;
