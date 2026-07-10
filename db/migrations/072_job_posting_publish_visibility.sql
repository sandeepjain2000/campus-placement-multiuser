-- Student listing visibility: status is source of truth; is_visible mirrors published state.

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS additional_info TEXT;

UPDATE job_postings
SET is_visible = (status = 'published'),
    published_at = CASE
      WHEN status = 'published' AND published_at IS NULL THEN COALESCE(updated_at, created_at, NOW())
      WHEN status <> 'published' THEN NULL
      ELSE published_at
    END;

CREATE OR REPLACE FUNCTION sync_job_posting_is_visible()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    NEW.is_visible := true;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := NOW();
    END IF;
  ELSE
    NEW.is_visible := false;
    IF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status IS DISTINCT FROM 'published' THEN
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_postings_sync_is_visible ON job_postings;
CREATE TRIGGER trg_job_postings_sync_is_visible
  BEFORE INSERT OR UPDATE OF status ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_posting_is_visible();

ALTER TABLE job_postings
  DROP CONSTRAINT IF EXISTS job_postings_is_visible_matches_status;

ALTER TABLE job_postings
  ADD CONSTRAINT job_postings_is_visible_matches_status
  CHECK (
    (status = 'published' AND is_visible = true)
    OR (status <> 'published' AND is_visible = false)
  );

CREATE INDEX IF NOT EXISTS idx_jobs_visible ON job_postings (is_visible) WHERE is_visible = true;
