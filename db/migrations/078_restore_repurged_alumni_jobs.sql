-- Restore alumni jobs accidentally soft-deleted by re-running migration 074.
-- Also records a one-time marker so 074's purge cannot wipe new jobs again.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_one_time_actions (
  action_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_one_time_actions (action_key)
VALUES ('074_alumni_job_purge')
ON CONFLICT (action_key) DO NOTHING;

-- Jobs created recently, published to campuses, then soft-deleted after create (re-purge).
UPDATE job_postings jp
SET is_deleted = false, updated_at = NOW()
WHERE COALESCE(jp.is_deleted, false) = true
  AND jp.job_type IN ('full_time', 'contract')
  AND jp.created_at >= NOW() - INTERVAL '7 days'
  AND jp.updated_at > jp.created_at + INTERVAL '30 seconds'
  AND EXISTS (SELECT 1 FROM job_posting_visibility jpv WHERE jpv.job_id = jp.id);

COMMIT;
