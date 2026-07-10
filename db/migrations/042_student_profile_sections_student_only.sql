-- Keep the student section seed data focused on student profile content only.

UPDATE student_education
SET description = 'Primary undergraduate academic record.'
WHERE description = 'Primary undergraduate record used for placement eligibility review.';

UPDATE student_projects
SET
  title = 'Student Profile Portfolio',
  description = 'Curated academic and project evidence including skills, coursework, and resume artifacts.',
  tech_stack = ARRAY['Profile Curation', 'Resume', 'Academic Readiness']
WHERE title = 'Placement Readiness Portfolio'
  AND description = 'Curated academic and project evidence for recruiter screening, including skills, eligibility, and resume artifacts.';

UPDATE student_profiles
SET aux_profile = jsonb_set(
    jsonb_set(
      aux_profile,
      '{responsibilities}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN item->>'title' = 'Campus placement preparation'
            THEN jsonb_build_object(
              'title', 'Student profile preparation',
              'organization', COALESCE(NULLIF(item->>'organization', ''), 'Academic office'),
              'period', COALESCE(NULLIF(item->>'period', ''), 'Current semester'),
              'description', 'Maintains an active student profile with resume, academic records, skills, and project evidence.'
            )
            ELSE item
          END
        )
        FROM jsonb_array_elements(COALESCE(aux_profile->'responsibilities', '[]'::jsonb)) AS item
      ),
      true
    ),
    '{accomplishments}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN item->>'title' = 'Placement profile verified'
          THEN jsonb_build_object(
            'title', 'Student profile verified',
            'issuer', COALESCE(NULLIF(item->>'issuer', ''), 'Academic office'),
            'year', item->'year',
            'description', 'Profile data is available for student record review and verification workflows.'
          )
          ELSE item
        END
      )
      FROM jsonb_array_elements(COALESCE(aux_profile->'accomplishments', '[]'::jsonb)) AS item
    ),
    true
  ),
  updated_at = NOW()
WHERE aux_profile ? 'responsibilities'
   OR aux_profile ? 'accomplishments';
