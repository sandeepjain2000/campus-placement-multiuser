-- Remove broken seeded profile photos / CV references that point at missing S3
-- objects or non-existent demo buckets (example-bucket.local). Fresh uploads are untouched
-- except for known seed user ids (b1000000-*).

-- 1. Seed demo avatars stored against AWS / invalid hosts
UPDATE users
SET avatar_url = NULL,
    updated_at = NOW()
WHERE id::text LIKE 'b1000000-%'
  AND avatar_url IS NOT NULL
  AND TRIM(avatar_url) <> ''
  AND (
    avatar_url ILIKE '%amazonaws%'
    OR avatar_url ILIKE '%.s3.%'
    OR avatar_url ILIKE '%invalid.invalid%'
    OR avatar_url ILIKE '%example-bucket%'
  );

-- 2. Clear non-existent resume profile URLs
UPDATE student_profiles
SET resume_url = NULL,
    updated_at = NOW()
WHERE resume_url IS NOT NULL
  AND TRIM(resume_url) <> ''
  AND (
    resume_url ILIKE '%example-bucket%'
    OR resume_url ILIKE '%campus-placement.local%'
    OR resume_url ILIKE '%/student-documents/%'
    OR (
      user_id::text LIKE 'b1000000-%'
      AND (
        resume_url ILIKE '%amazonaws%'
        OR resume_url ILIKE '%.s3.%'
      )
    )
  );

-- 3. Drop fake seed document rows (no app FKs into student_documents)
DELETE FROM student_documents
WHERE file_url ILIKE '%example-bucket%'
   OR file_url ILIKE '%campus-placement.local%'
   OR file_url ILIKE '%/student-documents/%';

DELETE FROM student_documents sd
USING student_profiles sp
WHERE sd.student_id = sp.id
  AND sp.user_id::text LIKE 'b1000000-%'
  AND (
    sd.file_url ILIKE '%amazonaws%'
    OR sd.file_url ILIKE '%.s3.%'
  );

-- 4. Archive broken labelled CVs (keep rows: applications.student_cv_id FK)
UPDATE student_cvs
SET file_url = '',
    archived_at = COALESCE(archived_at, NOW()),
    is_default = false,
    updated_at = NOW()
WHERE archived_at IS NULL
  AND (
    file_url ILIKE '%example-bucket%'
    OR file_url ILIKE '%campus-placement.local%'
    OR file_url ILIKE '%/student-documents/%'
    OR (
      student_id IN (
        SELECT id FROM student_profiles WHERE user_id::text LIKE 'b1000000-%'
      )
      AND (
        file_url ILIKE '%amazonaws%'
        OR file_url ILIKE '%.s3.%'
      )
    )
  );

-- 5. Drop default flags only when no active CV remains for that student
UPDATE student_cvs sc
SET is_default = true,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (student_id) id
  FROM student_cvs
  WHERE archived_at IS NULL
    AND file_url IS NOT NULL
    AND TRIM(file_url) <> ''
  ORDER BY student_id, created_at DESC
) pick
WHERE sc.id = pick.id
  AND NOT EXISTS (
    SELECT 1
    FROM student_cvs d
    WHERE d.student_id = sc.student_id
      AND d.is_default = true
      AND d.archived_at IS NULL
      AND d.file_url IS NOT NULL
      AND TRIM(d.file_url) <> ''
  );
