-- College-triggered tax / donation receipt email to employer (one send per payment)
CREATE TABLE IF NOT EXISTS sponsorship_donation_receipt_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES sponsorship_payments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sent_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_email TEXT NOT NULL,
    receipt_number VARCHAR(96) NOT NULL,
    subject TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_receipt_sends_tenant ON sponsorship_donation_receipt_sends (tenant_id, sent_at DESC);

INSERT INTO system_email_templates (template_key, description, subject_template, body_template)
VALUES (
    'sponsorship_donation_receipt',
    'Email to employer when the college sends a sponsorship donation receipt for tax records. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerCompany}}, {{employerName}}, {{employerEmail}}, {{receiptNumber}}, {{receiptDate}}, {{paymentRecordedDate}}, {{amountInr}}, {{tierName}}, {{category}}, {{paymentMethodLabel}}, {{taxNote}}',
    'Donation / sponsorship receipt {{receiptNumber}} — {{collegeName}}',
    'Dear {{employerName}},

{{collegeName}} acknowledges the following sponsorship contribution for your records.

Receipt number: {{receiptNumber}}
Receipt date: {{receiptDate}}
Payment recorded on platform: {{paymentRecordedDate}}

Sponsor (organization): {{employerCompany}}
Contact email: {{employerEmail}}

Sponsorship details
-------------------
Category: {{category}}
Tier: {{tierName}}
Amount (INR): {{amountInr}}
Payment method (as recorded): {{paymentMethodLabel}}

Institution
-----------
{{collegeName}}
{{collegeCity}}, {{collegeState}}

{{taxNote}}

This message was issued from the college placement office via PlacementHub. Please retain this email for your tax and accounting documentation. Consult a qualified tax professional regarding deductibility under applicable law (e.g. Section 80G in India, if applicable).

With thanks,
{{collegeName}}'
)
ON CONFLICT (template_key) DO NOTHING;
