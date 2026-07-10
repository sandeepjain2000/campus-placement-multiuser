-- =============================================================================
-- Unify offers.is_latest partitions: same student + same company should share one
-- chain whether the row is employer-linked (employer_id set) or college-entered
-- (reported_company_name only). Previously employer rows used 'e:'||employer_id
-- and off-platform rows used 'c:'||reported_company_name, so a student could
-- have two is_latest = 1 rows for the same company.
--
-- Partition key (per student): normalized COALESCE(
--   trimmed reported_company_name,
--   employer_profiles.company_name,
--   'employer:'||employer_id,
--   'offplatform'
-- )
--
-- Safe to re-run; recomputes all is_latest flags.
-- Requires: offers.is_latest (019), offers.reported_company_name (018), employer_profiles.
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
    RAISE NOTICE '021: offers.is_latest missing — run 019 first.';
    RETURN;
  END IF;

  IF NOT has_reported THEN
    RAISE NOTICE '021: offers.reported_company_name missing — run 018 first.';
    RETURN;
  END IF;

  UPDATE offers o
  SET reported_company_name = ep.company_name
  FROM employer_profiles ep
  WHERE o.employer_id = ep.id
    AND (o.reported_company_name IS NULL OR TRIM(o.reported_company_name) = '');

  EXECUTE $sql$
    WITH ranked AS (
      SELECT o.id,
        ROW_NUMBER() OVER (
          PARTITION BY o.student_id,
            LOWER(TRIM(COALESCE(
              NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
              ep.company_name,
              CASE
                WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text
                ELSE 'offplatform'
              END
            )))
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
