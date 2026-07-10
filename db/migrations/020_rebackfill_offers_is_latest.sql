-- =============================================================================
-- Re-backfill offers.is_latest using reported_company_name for off-platform rows.
--
-- Run order: 019_offers_is_latest.sql (adds is_latest), then
-- 018_college_offers_reported_company.sql (adds reported_company_name), then this file.
--
-- If you applied 018 before 019, you can skip this — 019’s backfill already used
-- company-level partitions. Use 020 when 019 ran first without reported_company_name
-- (legacy partition: one chain per student for all employer_id IS NULL rows).
--
-- Safe to re-run: recomputes all is_latest flags from scratch.
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
    RAISE NOTICE '020_rebackfill_offers_is_latest: offers.is_latest not found — run 019 first.';
    RETURN;
  END IF;

  IF NOT has_reported THEN
    RAISE NOTICE '020_rebackfill_offers_is_latest: offers.reported_company_name not found — run 018 first.';
    RETURN;
  END IF;

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
END $$;
