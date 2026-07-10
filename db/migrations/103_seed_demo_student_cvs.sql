-- Backfill demo student résumés + student_cvs for multi-CV apply (existing DBs that ran seed before 099/103).

-- Missing resume documents for seeded demo rolls (idempotent).
INSERT INTO student_documents (student_id, document_type, document_name, file_url, file_size, is_verified)
SELECT sp.id, v.document_type, v.document_name, v.file_url, v.file_size, v.is_verified
FROM student_profiles sp
JOIN (
  VALUES
    ('CS2021003', 'resume', 'Kavya_Reddy_Resume.pdf', 'https://example-bucket.local/docs/kavya-resume.pdf', 228000, true),
    ('EC2021001', 'resume', 'Rohan_Sharma_Resume.pdf', 'https://example-bucket.local/docs/rohan-resume.pdf', 219000, true),
    ('ME2021001', 'resume', 'Vikram_Singh_Resume.pdf', 'https://example-bucket.local/docs/vikram-resume.pdf', 205000, true),
    ('EE2021102', 'resume', 'Aditya_Menon_Resume.pdf', 'https://example-bucket.local/docs/aditya-resume.pdf', 198000, true),
    ('CS2021201', 'resume', 'Rahul_Mehta_Resume.pdf', 'https://example-bucket.local/docs/rahul-resume.pdf', 241000, true),
    ('EC2021202', 'resume', 'Priya_Singh_Resume.pdf', 'https://example-bucket.local/docs/priya-singh-resume.pdf', 207000, true)
) AS v(roll_number, document_type, document_name, file_url, file_size, is_verified)
  ON sp.roll_number = v.roll_number
WHERE NOT EXISTS (
  SELECT 1 FROM student_documents sd
  WHERE sd.student_id = sp.id
    AND LOWER(sd.document_type) = 'resume'
    AND sd.file_url = v.file_url
);

-- Prefer real resume documents over dummy.pdf placeholders on profiles.
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
  ORDER BY sd.student_id, sd.uploaded_at DESC NULLS LAST
) AS latest
WHERE sp.id = latest.student_id
  AND (
    sp.resume_url IS NULL
    OR TRIM(sp.resume_url) = ''
    OR sp.resume_url ILIKE '%dummy.pdf%'
  );

-- Labelled CV rows for apply flow (requires student_cvs from migration 099).
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
  ORDER BY student_id, is_default DESC, created_at DESC
) pick
WHERE sc.id = pick.id
  AND NOT EXISTS (
    SELECT 1 FROM student_cvs d
    WHERE d.student_id = sc.student_id AND d.is_default = true AND d.archived_at IS NULL
  );
