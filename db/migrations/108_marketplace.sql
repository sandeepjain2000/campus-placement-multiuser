-- PlacementHub Marketplace: providers, catalog services, and purchase orders.
-- Super admin catalogs providers (e.g. Aptitude Tests). Colleges and employers request purchases.

CREATE TABLE IF NOT EXISTS marketplace_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'other',
  tagline VARCHAR(300),
  description TEXT,
  website VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(40),
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_providers_category ON marketplace_providers(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_providers_active ON marketplace_providers(is_active);

CREATE TABLE IF NOT EXISTS marketplace_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES marketplace_providers(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price_inr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price_inr >= 0),
  billing_unit VARCHAR(40) NOT NULL DEFAULT 'one_time',
  available_to_college BOOLEAN NOT NULL DEFAULT true,
  available_to_employer BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_services_provider ON marketplace_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_services_published ON marketplace_services(is_published);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES marketplace_services(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES marketplace_providers(id) ON DELETE RESTRICT,
  buyer_role VARCHAR(40) NOT NULL CHECK (buyer_role IN ('college_admin', 'employer')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES employer_profiles(id) ON DELETE SET NULL,
  buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(40) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'fulfilled', 'cancelled')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  buyer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_orders_buyer_org CHECK (
    (buyer_role = 'college_admin' AND tenant_id IS NOT NULL)
    OR (buyer_role = 'employer' AND employer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer_user ON marketplace_orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_tenant ON marketplace_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_employer ON marketplace_orders(employer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON marketplace_orders(created_at DESC);

-- Baseline catalog seed (expanded further in 109_marketplace_seed_catalog.sql).
INSERT INTO marketplace_providers (name, category, tagline, description, website, contact_email, is_active)
SELECT
  'CampusApt Prep',
  'aptitude_tests',
  'Campus-ready aptitude and analytical assessments',
  'Standardized aptitude batteries for placement seasons — numerical, logical, and verbal modules with campus batch scheduling.',
  'https://example.com/campusapt',
  'partners@campusapt.example',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM marketplace_providers WHERE LOWER(name) = LOWER('CampusApt Prep')
);

INSERT INTO marketplace_services (
  provider_id, title, description, price_inr, billing_unit,
  available_to_college, available_to_employer, is_published, sort_order
)
SELECT
  p.id,
  'Batch Aptitude Assessment (300 seats)',
  'One campus cohort of up to 300 students. Includes online proctoring window coordination and score CSV export for PlacementHub assessment uploads.',
  45000.00,
  'per_batch',
  true,
  true,
  true,
  10
FROM marketplace_providers p
WHERE LOWER(p.name) = LOWER('CampusApt Prep')
  AND NOT EXISTS (
    SELECT 1
    FROM marketplace_services s
    WHERE s.provider_id = p.id
      AND LOWER(s.title) = LOWER('Batch Aptitude Assessment (300 seats)')
  );
