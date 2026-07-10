-- Legal name / PAN / GST for sponsorship receipts (employer defaults + per-payment snapshot)

ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS billing_legal_name VARCHAR(280),
  ADD COLUMN IF NOT EXISTS billing_pan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS billing_gst_number VARCHAR(18);

ALTER TABLE sponsorship_payments
  ADD COLUMN IF NOT EXISTS billing_legal_name VARCHAR(280),
  ADD COLUMN IF NOT EXISTS billing_pan VARCHAR(10),
  ADD COLUMN IF NOT EXISTS billing_gst_number VARCHAR(18);

-- Extend receipt template for Super Admin–editable copy (existing installs)
UPDATE system_email_templates
SET description = 'Email to employer when the college sends a sponsorship donation receipt for tax records. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerCompany}}, {{employerName}}, {{employerEmail}}, {{billingLegalName}}, {{billingPan}}, {{billingGstNumber}}, {{receiptNumber}}, {{receiptDate}}, {{paymentRecordedDate}}, {{amountInr}}, {{tierName}}, {{category}}, {{paymentMethodLabel}}, {{taxNote}}',
    body_template = 'Dear {{employerName}},

{{collegeName}} acknowledges the following sponsorship contribution for your records.

Receipt number: {{receiptNumber}}
Receipt date: {{receiptDate}}
Payment recorded on platform: {{paymentRecordedDate}}

Sponsor (organization): {{employerCompany}}
Contact email: {{employerEmail}}

Legal / tax details (as furnished at payment)
-------------------------------------------
Legal name: {{billingLegalName}}
PAN: {{billingPan}}
GSTIN: {{billingGstNumber}}

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
WHERE template_key = 'sponsorship_donation_receipt';
