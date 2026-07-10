-- Prefer the latest real student-uploaded resume over seed/demo placeholders on student_profiles.

UPDATE student_profiles sp
SET
  resume_url = latest.file_url,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (sd.student_id)
    sd.student_id,
    sd.file_url
  FROM student_documents sd
  WHERE sd.document_type = 'resume'
    AND sd.file_url IS NOT NULL
    AND TRIM(sd.file_url) <> ''
    AND sd.file_url NOT ILIKE '%campus-placement.local%'
    AND sd.file_url NOT ILIKE '%/student-documents/%'
    AND sd.file_url NOT ILIKE '%dummy.pdf%'
  ORDER BY sd.student_id, sd.uploaded_at DESC
) AS latest
WHERE sp.id = latest.student_id
  AND (
    sp.resume_url IS NULL
    OR TRIM(sp.resume_url) = ''
    OR sp.resume_url ILIKE '%campus-placement.local%'
    OR sp.resume_url ILIKE '%/student-documents/%'
    OR sp.resume_url ILIKE '%dummy.pdf%'
  );
