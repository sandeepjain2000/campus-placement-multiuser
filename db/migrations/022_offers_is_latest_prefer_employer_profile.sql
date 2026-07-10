-- =============================================================================
-- Tighten offers.is_latest partitions for employer-linked rows.
--
-- Migration 021 still preferred non-empty reported_company_name before
-- employer_profiles.company_name, so a stale/typo reported_company_name on a
-- linked row could split one student+company into two "latest" chains.
--
-- This migration:
--   1) Sets reported_company_name = employer_profiles.company_name for every
--      row with employer_id (canonical display + partition).
--   2) Recomputes is_latest using: for linked rows, partition on ep.company_name
--      first; college-only rows still use trimmed reported_company_name;
--      whitespace collapsed to single spaces; lower(trim).
--
-- Safe to re-run. Requires 018 (reported_company_name), 019 (is_latest).
-- =============================================================================

DO $$
DECLARE
  has_reported boolean;
  has_is_latest boolean;
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

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = current_schema()
      AND c.relname = 'offers'
      AND a.attname = 'is_latest'
      AND NOT a.attisdropped
      AND a.attnum > 0
  )
  INTO has_is_latest;

  IF NOT has_is_latest THEN
    RAISE NOTICE '022: offers.is_latest missing — run 019 first.';
    RETURN;
  END IF;

  IF NOT has_reported THEN
    RAISE NOTICE '022: offers.reported_company_name missing — run 018 first.';
    RETURN;
  END IF;

  UPDATE offers o
  SET reported_company_name = ep.company_name
  FROM employer_profiles ep
  WHERE o.employer_id = ep.id
    AND ep.company_name IS NOT NULL
    AND (o.reported_company_name IS DISTINCT FROM ep.company_name);

  EXECUTE $sql$
    WITH ranked AS (
      SELECT o.id,
        ROW_NUMBER() OVER (
          PARTITION BY o.student_id,
            LOWER(TRIM(regexp_replace(COALESCE(
              CASE WHEN o.employer_id IS NOT NULL THEN ep.company_name END,
              NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
              CASE
                WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text
                ELSE 'offplatform'
              END
            ), '[[:space:]]+', ' ', 'g')))
          ORDER BY o.created_at DESC, o.id DESC
        ) AS rn
      FROM offers o
      LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
    )
    UPDATE offers o
    SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END
    FROM ranked r
    WHERE o.id = r.id
  $sql$;
END $$;
