-- Per-category allowlists: which approved colleges may receive each posting type.

ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS posting_campus_constraints JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN employer_profiles.posting_campus_constraints IS
  'Optional tenant_id allowlists per posting category (internship, projects, alumni_jobs, drives). Empty array = no restriction.';
