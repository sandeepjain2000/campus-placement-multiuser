-- Synced from db/migrations/004_group_tenants_student_affiliation.sql (idempotent).

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);

COMMENT ON COLUMN tenants.parent_tenant_id IS
  'When set, this tenant is a member college under a group tenant (the parent). Group accounts use type=group; member colleges link here.';

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS affiliated_institution_name VARCHAR(255);

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS member_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_member_tenant ON student_profiles(member_tenant_id);

COMMENT ON COLUMN student_profiles.affiliated_institution_name IS
  'Optional label for sub-college/campus when the student''s user.tenant_id is a shared group.';

COMMENT ON COLUMN student_profiles.member_tenant_id IS
  'Optional FK to the member college tenant when placement is managed at group level.';
