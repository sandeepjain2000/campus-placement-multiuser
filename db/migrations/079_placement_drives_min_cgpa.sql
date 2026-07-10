-- Minimum CGPA eligibility on placement drives (employer sets on request; students/college see on listings).

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS min_cgpa DECIMAL(4,2);

COMMENT ON COLUMN placement_drives.min_cgpa IS 'Minimum student CGPA required to apply; null means no drive-specific floor.';
