-- Super-admin institution classifications (Yes/No). Not editable by college admins.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_central_university BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_state_university BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deemed_university BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_university BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_institution_national_importance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_institute_state_legislature BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_affiliated_college BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_autonomous_college BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_constituent_college BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_government_college BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_aided_college BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_unaided_college BOOLEAN NOT NULL DEFAULT false;
