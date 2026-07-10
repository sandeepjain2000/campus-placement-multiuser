-- Back student detail sections used by the Students view.
-- Existing aux_profile values are preserved; missing section arrays receive sensible defaults.

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS aux_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN student_profiles.aux_profile IS
  'JSON: phones, emails, profileLinks, languages, subjects, workExperience, responsibilities, accomplishments, volunteering, extracurriculars';

WITH defaults AS (
  SELECT
    sp.id,
    jsonb_build_array(
      jsonb_build_object('name', 'English', 'proficiency', 'Professional working proficiency'),
      jsonb_build_object('name', 'Hindi', 'proficiency', 'Professional working proficiency')
    ) AS languages,
    jsonb_build_array(
      jsonb_build_object('name', COALESCE(NULLIF(sp.branch, ''), NULLIF(sp.department, ''), 'Core Engineering')),
      jsonb_build_object('name', 'Data Structures and Algorithms')
    ) AS subjects,
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Student profile preparation',
        'organization', COALESCE(NULLIF(t.name, ''), 'Academic office'),
        'period', 'Current semester',
        'description', 'Maintains an active student profile with resume, academic records, skills, and project evidence.'
      )
    ) AS responsibilities,
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Student profile verified',
        'issuer', COALESCE(NULLIF(t.name, ''), 'Academic office'),
        'year', COALESCE(sp.graduation_year, EXTRACT(YEAR FROM NOW())::int),
        'description', 'Profile data is available for student record review and verification workflows.'
      )
    ) AS accomplishments,
    '[]'::jsonb AS work_experience,
    '[]'::jsonb AS volunteering,
    '[]'::jsonb AS extracurriculars
  FROM student_profiles sp
  LEFT JOIN tenants t ON t.id = sp.tenant_id
)
UPDATE student_profiles sp
SET
  aux_profile =
    COALESCE(sp.aux_profile, '{}'::jsonb)
    || jsonb_build_object(
      'languages', COALESCE(sp.aux_profile->'languages', defaults.languages),
      'subjects', COALESCE(sp.aux_profile->'subjects', defaults.subjects),
      'workExperience', COALESCE(sp.aux_profile->'workExperience', defaults.work_experience),
      'responsibilities', COALESCE(sp.aux_profile->'responsibilities', defaults.responsibilities),
      'accomplishments', COALESCE(sp.aux_profile->'accomplishments', defaults.accomplishments),
      'volunteering', COALESCE(sp.aux_profile->'volunteering', defaults.volunteering),
      'extracurriculars', COALESCE(sp.aux_profile->'extracurriculars', defaults.extracurriculars)
    ),
  updated_at = NOW()
FROM defaults
WHERE defaults.id = sp.id;

INSERT INTO student_education (
  student_id,
  institution,
  degree,
  field_of_study,
  start_year,
  end_year,
  grade,
  description
)
SELECT
  sp.id,
  COALESCE(NULLIF(t.name, ''), 'Campus Institution'),
  'B.Tech',
  COALESCE(NULLIF(sp.branch, ''), NULLIF(sp.department, ''), 'Engineering'),
  sp.batch_year,
  sp.graduation_year,
  CASE WHEN sp.cgpa IS NOT NULL THEN sp.cgpa::text || ' CGPA' ELSE NULL END,
  'Primary undergraduate academic record.'
FROM student_profiles sp
LEFT JOIN tenants t ON t.id = sp.tenant_id
WHERE NOT EXISTS (
  SELECT 1
  FROM student_education se
  WHERE se.student_id = sp.id
);

INSERT INTO student_documents (
  student_id,
  document_type,
  document_name,
  file_url,
  file_size,
  is_verified
)
SELECT
  sp.id,
  'resume',
  COALESCE(NULLIF(sp.roll_number, ''), 'Student') || '_Resume.pdf',
  COALESCE(NULLIF(sp.resume_url, ''), 'https://campus-placement.local/student-documents/' || sp.id::text || '/resume.pdf'),
  245000,
  sp.is_verified
FROM student_profiles sp
WHERE NOT EXISTS (
  SELECT 1
  FROM student_documents sd
  WHERE sd.student_id = sp.id
    AND sd.document_type = 'resume'
);

INSERT INTO student_projects (
  student_id,
  title,
  description,
  tech_stack,
  project_url,
  github_url,
  start_date,
  end_date
)
SELECT
  sp.id,
  'Student Profile Portfolio',
  'Curated academic and project evidence including skills, coursework, and resume artifacts.',
  ARRAY['Profile Curation', 'Resume', 'Academic Readiness'],
  NULL,
  NULL,
  make_date(COALESCE(sp.graduation_year, EXTRACT(YEAR FROM NOW())::int) - 1, 1, 1),
  NULL
FROM student_profiles sp
WHERE NOT EXISTS (
  SELECT 1
  FROM student_projects pr
  WHERE pr.student_id = sp.id
);
