-- Startup seed funding program catalog (informational only — no in-app transactions).

CREATE TABLE IF NOT EXISTS startup_funding_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(120) NOT NULL,
  description TEXT,
  tier_name VARCHAR(120) NOT NULL,
  price_inr BIGINT NOT NULL CHECK (price_inr >= 0),
  benefits TEXT[] DEFAULT '{}',
  label VARCHAR(60),
  is_active BOOLEAN DEFAULT true,
  payments_permitted INTEGER NOT NULL DEFAULT 1 CHECK (payments_permitted >= 1 AND payments_permitted <= 36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_funding_opportunities_tenant
  ON startup_funding_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_startup_funding_opportunities_active
  ON startup_funding_opportunities(is_active);

CREATE TABLE IF NOT EXISTS startup_funding_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES startup_funding_opportunities(id) ON DELETE CASCADE,
  employer_profile_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_sequence INTEGER NOT NULL CHECK (payment_sequence >= 1),
  amount_inr BIGINT NOT NULL CHECK (amount_inr > 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('online', 'cheque', 'bank_transfer')),
  status VARCHAR(40) NOT NULL DEFAULT 'recorded',
  gateway_provider VARCHAR(80),
  gateway_reference VARCHAR(200),
  cheque_mailed_at TIMESTAMPTZ,
  bank_transfer_confirmed_at TIMESTAMPTZ,
  proof_attachment TEXT,
  billing_legal_name VARCHAR(280),
  billing_pan VARCHAR(10),
  billing_gst_number VARCHAR(18),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (opportunity_id, employer_profile_id, payment_sequence)
);

CREATE INDEX IF NOT EXISTS idx_startup_funding_payments_tenant_created
  ON startup_funding_payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_funding_payments_employer
  ON startup_funding_payments(employer_profile_id);

CREATE TABLE IF NOT EXISTS startup_funding_receipt_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES startup_funding_payments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sent_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  receipt_number VARCHAR(96) NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS idx_startup_funding_receipt_sends_tenant
  ON startup_funding_receipt_sends(tenant_id, sent_at DESC);

INSERT INTO system_email_templates (template_key, description, subject_template, body_template)
VALUES (
  'startup_funding_college_thanks_investor',
  'Email to employer when a startup seed funding payment is recorded. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerName}}, {{employerEmail}}, {{employerCompany}}, {{fundingTierName}}, {{fundingCategory}}, {{amountInr}}, {{placementSeasonLabel}}',
  'Thank you for supporting {{collegeName}} startups — {{fundingTierName}}',
  'Dear {{employerName}},

Thank you for committing {{amountInr}} toward {{fundingTierName}} ({{fundingCategory}}) at {{collegeName}}.

Your support helps student-led ventures in our incubation ecosystem during {{placementSeasonLabel}}. Our innovation office will reach out with allocation details and startup showcase opportunities.

Institution: {{collegeName}}, {{collegeCity}}, {{collegeState}}
Organization: {{employerCompany}}
Contact: {{employerEmail}}

With gratitude,
Innovation & Incubation Cell
{{collegeName}}'
),
(
  'startup_funding_receipt',
  'Receipt email to employer for startup seed funding. Placeholders: {{collegeName}}, {{collegeCity}}, {{collegeState}}, {{employerCompany}}, {{employerName}}, {{employerEmail}}, {{billingLegalName}}, {{billingPan}}, {{billingGstNumber}}, {{receiptNumber}}, {{receiptDate}}, {{paymentRecordedDate}}, {{amountInr}}, {{tierName}}, {{category}}, {{paymentMethodLabel}}, {{taxNote}}',
  'Startup seed funding receipt {{receiptNumber}} — {{collegeName}}',
  'Dear {{employerName}},

{{collegeName}} acknowledges the following startup seed funding contribution for your records.

Receipt number: {{receiptNumber}}
Receipt date: {{receiptDate}}
Payment recorded on platform: {{paymentRecordedDate}}

Investor (organization): {{employerCompany}}
Contact email: {{employerEmail}}

Legal / tax details (as furnished at payment)
-------------------------------------------
Legal name: {{billingLegalName}}
PAN: {{billingPan}}
GSTIN: {{billingGstNumber}}

Funding details
---------------
Category: {{category}}
Program tier: {{tierName}}
Amount (INR): {{amountInr}}
Payment method (as recorded): {{paymentMethodLabel}}

Institution
-----------
{{collegeName}}
{{collegeCity}}, {{collegeState}}

{{taxNote}}

This message was issued from the college innovation office via PlacementHub. Please retain this email for your tax and accounting documentation.

With thanks,
{{collegeName}}'
)
ON CONFLICT (template_key) DO NOTHING;

-- Demo seed tiers (IITM, NITT, BITS tenants from seed.sql)
INSERT INTO startup_funding_opportunities (id, tenant_id, category, description, tier_name, price_inr, benefits, label, is_active, payments_permitted) VALUES
('ac100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Incubation & Pre-seed', 'Support early-stage student startups in campus incubators with grant-style seed capital.', 'Micro Grant', 200000, ARRAY['Fund one pre-seed startup cohort slot', 'Quarterly progress digest', 'Invite to demo day'], 'Entry', true, 1),
('ac100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Incubation & Pre-seed', 'Support early-stage student startups in campus incubators with grant-style seed capital.', 'Pre-seed Partner', 750000, ARRAY['Micro grant benefits', 'Named mentor hours pool', 'Priority pitch to investors'], 'Popular', true, 1),
('ac100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Demo Day & Pitch', 'Fund demo day winners and inter-college pitch competitions.', 'Demo Day Prize Pool', 350000, ARRAY['Co-branded demo day awards', 'Judge seat for one representative', 'Media mention in event recap'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Sector Innovation Fund', 'Deep tech, climate, and healthtech ventures from student founders.', 'Deep Tech Seed', 1500000, ARRAY['Sector-specific startup shortlist access', 'Lab partnership day', 'Annual innovation report'], 'Featured', true, 1),
('ac100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Incubation & Pre-seed', 'Capital for NIT Trichy incubation hub ventures.', 'Campus Venture Grant', 250000, ARRAY['One incubation seat funded', 'Mentor connect session', 'Showcase on careers portal'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Mentor-linked Seed Pool', 'Seed capital paired with structured mentor engagement.', 'Mentor Seed Circle', 500000, ARRAY['Grant benefits', 'Quarterly mentor roundtable', 'Startup hiring visibility'], 'Popular', true, 1),
('ac100000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'Incubation & Pre-seed', 'Support BITS Pilani student-led ventures.', 'PIEDE Seed Grant', 300000, ARRAY['Incubation cell grant allocation', 'Demo showcase slot', 'Alumni investor intro'], NULL, true, 1),
('ac100000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Demo Day & Pitch', 'Prize and follow-on funding for pitch winners.', 'Pitch Winner Fund', 450000, ARRAY['Named pitch track', 'Winner prize co-funding', 'Employer office hours'], NULL, true, 1)
ON CONFLICT (id) DO NOTHING;
