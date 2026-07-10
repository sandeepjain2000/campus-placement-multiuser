-- College staff (placement coordinators) assigned to a placement drive.

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS attached_staff_user_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN placement_drives.attached_staff_user_ids IS
  'College admin user IDs coordinating this drive for the tenant.';
