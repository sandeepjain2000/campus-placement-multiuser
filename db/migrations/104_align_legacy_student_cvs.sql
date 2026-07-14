-- Align pre-multi-CV data with labelled student_cvs + application links.
-- Safe to re-run (idempotent). Run after 099_student_cvs.sql (and 103 for demo seed gaps).

-- ---------------------------------------------------------------------------
-- 1. Profile resume_url: prefer latest real resume document over placeholders
-- ---------------------------------------------------------------------------
UPDATE student_profiles sp
SET resume_url = latest.file_url, updated_at = NOW()
FROM (
  SELECT DISTINCT ON (sd.student_id)
    sd.student_id,
    sd.file_url
  FROM student_documents sd
  WHERE LOWER(sd.document_type) = 'resume'
    AND sd.file_url IS NOT NULL
    AND TRIM(sd.file_url) <> ''
    AND sd.file_url NOT ILIKE '%dummy.pdf%'
    AND sd.file_url NOT ILIKE '%wai/er/tests%'
    AND sd.file_url NOT ILIKE '%example-bucket%'
    AND sd.file_url NOT ILIKE '%campus-placement.local%'
  ORDER BY sd.student_id, sd.uploaded_at DESC NULLS LAST
) AS latest
WHERE sp.id = latest.student_id
  AND (
    sp.resume_url IS NULL
    OR TRIM(sp.resume_url) = ''
    OR sp.resume_url ILIKE '%dummy.pdf%'
    OR sp.resume_url ILIKE '%wai/er/tests%'
    OR sp.resume_url ILIKE '%example-bucket%'
    OR sp.resume_url ILIKE '%campus-placement.local%'
    OR TRIM(sp.resume_url) <> TRIM(latest.file_url)
  );

-- ---------------------------------------------------------------------------
-- 2. student_cvs from resume documents (one row per distinct file_url)
-- ---------------------------------------------------------------------------
INSERT INTO student_cvs (
  student_id, label, file_url, file_size, original_file_name, file_extension,
  is_default, created_at, updated_at
)
SELECT
  sd.student_id,
  LEFT(
    COALESCE(
      NULLIF(
        TRIM(
          regexp_replace(
            COALESCE(
              NULLIF(TRIM(regexp_replace(sd.document_name, '\.[^.]+$', '')), ''),
              'CV'
            ),
            '[^[:alnum:][:space:]._-]', '', 'g'
          )
        ),
        ''
      ),
      'CV'
    ),
    20
  ) AS label,
  sd.file_url,
  sd.file_size,
  sd.document_name,
  COALESCE(
    NULLIF(LOWER(substring(sd.document_name from '\.[^.]+$')), ''),
    '.pdf'
  ) AS file_extension,
  (
    sp.resume_url IS NOT NULL
    AND TRIM(sp.resume_url) <> ''
    AND TRIM(sd.file_url) = TRIM(sp.resume_url)
  ) AS is_default,
  COALESCE(sd.uploaded_at, NOW()),
  COALESCE(sd.uploaded_at, NOW())
FROM student_documents sd
INNER JOIN student_profiles sp ON sp.id = sd.student_id
WHERE LOWER(sd.document_type) = 'resume'
  AND sd.file_url IS NOT NULL
  AND TRIM(sd.file_url) <> ''
  AND sd.file_url NOT ILIKE '%dummy.pdf%'
  AND sd.file_url NOT ILIKE '%wai/er/tests%'
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs sc
    WHERE sc.student_id = sd.student_id AND sc.file_url = sd.file_url
  );

-- ---------------------------------------------------------------------------
-- 3. student_cvs from profile resume_url when no matching row exists
--    (legacy uploads that only updated student_profiles.resume_url)
-- ---------------------------------------------------------------------------
INSERT INTO student_cvs (
  student_id, label, file_url, file_size, original_file_name, file_extension,
  is_default, created_at, updated_at
)
SELECT
  sp.id,
  LEFT(
    COALESCE(
      NULLIF(
        TRIM(
          regexp_replace(
            COALESCE(
              NULLIF(
                TRIM(
                  regexp_replace(
                    COALESCE(NULLIF(TRIM(substring(sp.resume_url from '[^/?#]+$')), ''), 'resume.pdf'),
                    '\.[^.]+$', ''
                  )
                ),
                ''
              ),
              'CV'
            ),
            '[^[:alnum:][:space:]._-]', '', 'g'
          )
        ),
        ''
      ),
      'CV'
    ),
    20
  ),
  TRIM(sp.resume_url),
  NULL,
  COALESCE(NULLIF(TRIM(substring(sp.resume_url from '[^/?#]+$')), ''), 'resume.pdf'),
  COALESCE(
    NULLIF(LOWER(substring(sp.resume_url from '\.[^.]+$')), ''),
    '.pdf'
  ),
  true,
  NOW(),
  NOW()
FROM student_profiles sp
WHERE sp.resume_url IS NOT NULL
  AND TRIM(sp.resume_url) <> ''
  AND sp.resume_url ~* '^https?://'
  AND sp.resume_url NOT ILIKE '%dummy.pdf%'
  AND sp.resume_url NOT ILIKE '%wai/er/tests%'
  AND sp.resume_url NOT ILIKE '%example-bucket.local%'
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs sc
    WHERE sc.student_id = sp.id
      AND sc.archived_at IS NULL
      AND TRIM(sc.file_url) = TRIM(sp.resume_url)
  );

-- ---------------------------------------------------------------------------
-- 4. One default active CV per student (match profile resume when possible)
-- ---------------------------------------------------------------------------
UPDATE student_cvs sc
SET is_default = false, updated_at = NOW()
FROM student_profiles sp
WHERE sc.student_id = sp.id
  AND sc.archived_at IS NULL
  AND sp.resume_url IS NOT NULL
  AND TRIM(sp.resume_url) <> ''
  AND TRIM(sc.file_url) <> TRIM(sp.resume_url);

UPDATE student_cvs sc
SET is_default = true, updated_at = NOW()
FROM student_profiles sp
WHERE sc.student_id = sp.id
  AND sc.archived_at IS NULL
  AND sp.resume_url IS NOT NULL
  AND TRIM(sp.resume_url) <> ''
  AND TRIM(sc.file_url) = TRIM(sp.resume_url);

UPDATE student_cvs sc
SET is_default = true, updated_at = NOW()
FROM (
  SELECT DISTINCT ON (student_id) id, student_id
  FROM student_cvs
  WHERE archived_at IS NULL
  ORDER BY student_id, is_default DESC, created_at DESC
) pick
WHERE sc.id = pick.id
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs d
    WHERE d.student_id = sc.student_id AND d.is_default = true AND d.archived_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- 5. Link legacy applications to the student's default CV
-- ---------------------------------------------------------------------------
UPDATE applications a
SET student_cv_id = pick.cv_id
FROM (
  SELECT DISTINCT ON (sc.student_id)
    sc.student_id,
    sc.id AS cv_id
  FROM student_cvs sc
  WHERE sc.archived_at IS NULL
  ORDER BY sc.student_id, sc.is_default DESC, sc.created_at DESC
) pick
WHERE a.student_id = pick.student_id
  AND a.student_cv_id IS NULL;

UPDATE program_applications pa
SET student_cv_id = pick.cv_id
FROM (
  SELECT DISTINCT ON (sc.student_id)
    sc.student_id,
    sc.id AS cv_id
  FROM student_cvs sc
  WHERE sc.archived_at IS NULL
  ORDER BY sc.student_id, sc.is_default DESC, sc.created_at DESC
) pick
WHERE pa.student_id = pick.student_id
  AND pa.student_cv_id IS NULL;
