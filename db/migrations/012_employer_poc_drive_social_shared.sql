-- Persist employer coordination POCs (college staff user IDs) and drive social-share flags.

ALTER TABLE employer_approvals
  ADD COLUMN IF NOT EXISTS coordination_poc_user_ids UUID[] DEFAULT '{}';

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS social_shared TEXT[] DEFAULT '{}';
