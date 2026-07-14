-- Do not seed demo résumés with fake or missing file hosts.
-- Previous versions inserted example-bucket.local URLs that looked like real CVs.
-- This migration clears those placeholders and only syncs real uploaded documents.

-- Remove non-existent demo document rows
DELETE FROM student_documents
WHERE file_url ILIKE '%example-bucket%'
   OR file_url ILIKE '%campus-placement.local%'
   OR file_url ILIKE '%/student-documents/%';

-- Archive labelled CVs that pointed at the same fake hosts
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
  );

-- Prefer latest real resume document over dummy.pdf placeholders on profiles.
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
    AND sd.file_url NOT ILIKE '%example-bucket%'
    AND sd.file_url NOT ILIKE '%campus-placement.local%'
    AND sd.file_url NOT ILIKE '%/student-documents/%'
  ORDER BY sd.student_id, sd.uploaded_at DESC NULLS LAST
) AS latest
WHERE sp.id = latest.student_id
  AND (
    sp.resume_url IS NULL
    OR TRIM(sp.resume_url) = ''
    OR sp.resume_url ILIKE '%dummy.pdf%'
    OR sp.resume_url ILIKE '%example-bucket%'
    OR sp.resume_url ILIKE '%campus-placement.local%'
  );

-- Clear remaining placeholder profile resume URLs with no real document
UPDATE student_profiles
SET resume_url = NULL, updated_at = NOW()
WHERE resume_url ILIKE '%example-bucket%'
   OR resume_url ILIKE '%campus-placement.local%'
   OR resume_url ILIKE '%/student-documents/%';

-- Labelled CV rows for apply flow from real resume documents only.
INSERT INTO student_cvs (
  student_id, label, file_url, file_size, original_file_name, file_extension,
  is_default, created_at, updated_at
)
SELECT
  sd.student_id,
  LEFT(
    COALESCE(
      NULLIF(TRIM(regexp_replace(sd.document_name, '\.[^.]+$', '')), ''),
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
  AND sd.file_url NOT ILIKE '%example-bucket%'
  AND sd.file_url NOT ILIKE '%campus-placement.local%'
  AND sd.file_url NOT ILIKE '%/student-documents/%'
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs sc
    WHERE sc.student_id = sd.student_id AND sc.file_url = sd.file_url
  );

UPDATE student_cvs sc
SET is_default = true, updated_at = NOW()
FROM (
  SELECT DISTINCT ON (student_id) id, student_id
  FROM student_cvs
  WHERE archived_at IS NULL
    AND file_url IS NOT NULL
    AND TRIM(file_url) <> ''
  ORDER BY student_id, is_default DESC, created_at DESC
) pick
WHERE sc.id = pick.id
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs d
    WHERE d.student_id = sc.student_id
      AND d.is_default = true
      AND d.archived_at IS NULL
      AND d.file_url IS NOT NULL
      AND TRIM(d.file_url) <> ''
  );
