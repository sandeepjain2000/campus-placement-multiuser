-- Employer-only CTC breakup on drive requests (not exposed to college/student APIs in this phase).

ALTER TABLE placement_drives
  ADD COLUMN IF NOT EXISTS ctc_breakup TEXT;

COMMENT ON COLUMN placement_drives.ctc_breakup IS 'Free-text CTC structure for employer records; omitted from college dashboard APIs.';
