-- Add first-class storage for sponsorship opportunities and clarifications.

CREATE TABLE IF NOT EXISTS sponsorship_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(120) NOT NULL,
  description TEXT,
  tier_name VARCHAR(120) NOT NULL,
  price_inr BIGINT NOT NULL CHECK (price_inr >= 0),
  benefits TEXT[] DEFAULT '{}',
  label VARCHAR(60),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_opportunities_tenant
  ON sponsorship_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_opportunities_active
  ON sponsorship_opportunities(is_active);

CREATE TABLE IF NOT EXISTS clarification_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  posted_by VARCHAR(255) NOT NULL,
  posted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clarification_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES clarification_batches(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  answered_by VARCHAR(255),
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clarification_batches_tenant
  ON clarification_batches(tenant_id, posted_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clarification_questions_batch
  ON clarification_questions(batch_id, created_at ASC);
