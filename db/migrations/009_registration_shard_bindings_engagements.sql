-- Opaque campus binding codes (not derived from college name; random hex).
-- Table/column names avoid obvious "public_id" / "invite" wording.
CREATE TABLE IF NOT EXISTS shard_binding_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_scope_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    surface_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shard_binding_pairs_token_lower ON shard_binding_pairs (lower(surface_token));

-- Backfill one random token per existing college tenant
INSERT INTO shard_binding_pairs (ref_scope_id, surface_token)
SELECT t.id,
       lower(replace(gen_random_uuid()::text, '-', ''))
       || lower(replace(gen_random_uuid()::text, '-', ''))
FROM tenants t
WHERE t.type = 'college'
  AND NOT EXISTS (
    SELECT 1 FROM shard_binding_pairs s WHERE s.ref_scope_id = t.id
  );

-- Platform registration moderation (employer / college self-serve)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS registration_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_rejection_note TEXT;

-- Guest faculty / lecture needs posted by colleges, visible to employers when published
CREATE TABLE IF NOT EXISTS campus_engagement_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kind VARCHAR(30) NOT NULL CHECK (kind IN ('guest_faculty', 'guest_lecture')),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    requirements TEXT,
    time_hint TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_engagement_listings_tenant ON campus_engagement_listings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_campus_engagement_listings_status ON campus_engagement_listings (status);
