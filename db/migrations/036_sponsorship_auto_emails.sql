-- College → employer thank-you (auto-sent with sponsorship payment). Separate from sponsorship_thank_you (employer → college).

INSERT INTO system_email_templates (template_key, description, subject_template, body_template)
VALUES (
    'sponsorship_college_thanks_sponsor',
    'Auto-sent to the employer immediately after they record a sponsorship payment (separate from the receipt email). Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerName}}, {{employerEmail}}, {{employerCompany}}, {{sponsorshipTierName}}, {{sponsorshipCategory}}, {{amountInr}}, {{placementSeasonLabel}}',
    'Thank you for supporting {{collegeName}}',
    'Dear {{employerName}},

On behalf of {{collegeName}}, thank you for your {{sponsorshipTierName}} sponsorship under our {{sponsorshipCategory}} program ({{amountInr}}).

Your partnership strengthens our campus community in {{collegeCity}}, {{collegeState}} during {{placementSeasonLabel}}.

We are sending a separate email with formal receipt details for your tax and accounting records.

With gratitude,
{{collegeName}}'
)
ON CONFLICT (template_key) DO NOTHING;

UPDATE system_email_templates
SET description = 'Sent automatically when a sponsorship payment is recorded, and may also be triggered manually from College → Sponsorships. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerCompany}}, {{employerName}}, {{employerEmail}}, {{billingLegalName}}, {{billingPan}}, {{billingGstNumber}}, {{receiptNumber}}, {{receiptDate}}, {{paymentRecordedDate}}, {{amountInr}}, {{tierName}}, {{category}}, {{paymentMethodLabel}}, {{taxNote}}'
WHERE template_key = 'sponsorship_donation_receipt';
