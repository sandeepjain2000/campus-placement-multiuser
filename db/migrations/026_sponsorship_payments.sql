-- Sponsorship installments, bank details on college_settings, payment audit trail.

ALTER TABLE sponsorship_opportunities
  ADD COLUMN IF NOT EXISTS payments_permitted INTEGER NOT NULL DEFAULT 1
  CHECK (payments_permitted >= 1 AND payments_permitted <= 36);

ALTER TABLE college_settings
  ADD COLUMN IF NOT EXISTS sponsorship_cheque_payable_to VARCHAR(280),
  ADD COLUMN IF NOT EXISTS sponsorship_bank_account_name VARCHAR(280),
  ADD COLUMN IF NOT EXISTS sponsorship_bank_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS sponsorship_bank_account_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS sponsorship_bank_ifsc VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sponsorship_bank_branch VARCHAR(280);

CREATE TABLE IF NOT EXISTS sponsorship_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES sponsorship_opportunities(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (opportunity_id, employer_profile_id, payment_sequence)
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_payments_tenant_created
  ON sponsorship_payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorship_payments_employer
  ON sponsorship_payments(employer_profile_id);
