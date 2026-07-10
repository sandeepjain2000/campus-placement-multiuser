-- Student-uploaded documents are accepted as verified immediately.
-- Existing pending documents are aligned with the new upload behavior.

UPDATE student_documents
SET is_verified = true
WHERE is_verified IS DISTINCT FROM true;

WITH latest_resume AS (
  SELECT DISTINCT ON (student_id)
    student_id,
    document_name,
    file_url
  FROM student_documents
  WHERE document_type = 'resume'
  ORDER BY student_id, uploaded_at DESC
)
UPDATE student_profiles sp
SET
  resume_url = COALESCE(NULLIF(sp.resume_url, ''), latest_resume.file_url),
  aux_profile = COALESCE(sp.aux_profile, '{}'::jsonb)
    || jsonb_build_object('cvFileName', latest_resume.document_name),
  updated_at = NOW()
FROM latest_resume
WHERE latest_resume.student_id = sp.id;
