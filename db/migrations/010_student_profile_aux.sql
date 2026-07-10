-- Rich student profile fields not covered by scalar columns (phones, extra emails, arbitrary profile links)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS aux_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN student_profiles.aux_profile IS 'JSON: { phones, emails, profileLinks } — see studentProfileDbMap.js';
