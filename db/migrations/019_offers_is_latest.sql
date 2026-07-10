-- =============================================================================
-- offers.is_latest — mark the current row per (student, employer) or per
-- (student, off-platform company). Older rows stay in the table with is_latest = 0.
--
-- Safe on existing databases: adds column, index, then recomputes flags for all rows.
-- Prerequisite: table `offers` must exist. If `reported_company_name` exists (migration 018),
-- partitions off-platform offers by company text; otherwise all employer_id IS NULL rows for
-- a student share one partition (best-effort legacy).
-- =============================================================================

-- Step 1: Column on existing table (default 1 until backfill runs)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS is_latest SMALLINT NOT NULL DEFAULT 1
  CHECK (is_latest IN (0, 1));

COMMENT ON COLUMN offers.is_latest IS '1 = newest offer in partition (student + employer or student + off-platform company); 0 = superseded history';

-- Step 2: Partial index for list queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_offers_student_is_latest ON offers (student_id) WHERE is_latest = 1;

-- Step 3: Backfill existing rows (overrides default 1 everywhere).
-- Use EXECUTE so the branch that references reported_company_name is only parsed when that
-- column exists (plain IF/WITH in plpgsql is still validated for both branches — ERROR 42703).
DO $$
DECLARE
  has_reported boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = current_schema()
      AND c.relname = 'offers'
      AND a.attname = 'reported_company_name'
      AND NOT a.attisdropped
      AND a.attnum > 0
  )
  INTO has_reported;

  IF has_reported THEN
    EXECUTE $sql$
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY student_id,
              CASE
                WHEN employer_id IS NOT NULL THEN 'e:' || employer_id::text
                ELSE 'c:' || LOWER(TRIM(COALESCE(reported_company_name, '')))
              END
            ORDER BY created_at DESC, id DESC
          ) AS rn
        FROM offers
      )
      UPDATE offers o
      SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END
      FROM ranked r
      WHERE o.id = r.id
    $sql$;
  ELSE
    EXECUTE $sql$
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY student_id,
              COALESCE(employer_id::text, 'offplatform')
            ORDER BY created_at DESC, id DESC
          ) AS rn
        FROM offers
      )
      UPDATE offers o
      SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END
      FROM ranked r
      WHERE o.id = r.id
    $sql$;
  END IF;
END $$;
