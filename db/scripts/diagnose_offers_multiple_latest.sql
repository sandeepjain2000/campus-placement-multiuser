-- Run in psql against your app database. Helps explain "duplicates" after migrations.
--
-- A) Students with more than one is_latest = 1 (usually different companies — OK).
SELECT student_id, COUNT(*) AS latest_offers
FROM offers
WHERE is_latest = 1
GROUP BY student_id
HAVING COUNT(*) > 1
ORDER BY latest_offers DESC;

-- B) For one student_id, show partition key + display fields (replace UUID).
-- \set sid 'YOUR-STUDENT-UUID-HERE'
-- SELECT o.id,
--        o.is_latest,
--        o.status,
--        o.employer_id,
--        o.reported_company_name,
--        ep.company_name AS employer_profile_company,
--        o.job_title,
--        o.salary,
--        LOWER(TRIM(regexp_replace(COALESCE(
--          CASE WHEN o.employer_id IS NOT NULL THEN ep.company_name END,
--          NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
--          CASE WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text ELSE 'offplatform' END
--        ), '[[:space:]]+', ' ', 'g'))) AS partition_key
-- FROM offers o
-- LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
-- WHERE o.student_id = :'sid'::uuid
-- ORDER BY o.is_latest DESC, o.created_at DESC;

-- C) Broken data: same student + same partition_key with more than one is_latest = 1 (should be zero).
WITH keys AS (
  SELECT o.id,
         o.student_id,
         o.is_latest,
         LOWER(TRIM(regexp_replace(COALESCE(
           CASE WHEN o.employer_id IS NOT NULL THEN ep.company_name END,
           NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
           CASE WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text ELSE 'offplatform' END
         ), '[[:space:]]+', ' ', 'g'))) AS partition_key
  FROM offers o
  LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
)
SELECT student_id, partition_key, COUNT(*) FILTER (WHERE is_latest = 1) AS n_latest
FROM keys
GROUP BY student_id, partition_key
HAVING COUNT(*) FILTER (WHERE is_latest = 1) > 1;
