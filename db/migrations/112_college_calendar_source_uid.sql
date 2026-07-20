-- ICS import dedupe key for college_calendar rows (Google/Outlook UID).
-- Multiple NULL source_uid values are allowed (Postgres UNIQUE treats NULL as distinct).
ALTER TABLE college_calendar
  ADD COLUMN IF NOT EXISTS source_uid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_college_calendar_tenant_source_uid
  ON college_calendar (tenant_id, source_uid);

COMMENT ON COLUMN college_calendar.source_uid IS
  'External calendar UID from .ics import; used to skip duplicates on re-import.';
