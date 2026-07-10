-- Sanitize demo/test student rows:
--   Degree (aux_profile.degreePursued + student_education.degree) → B.Tech
--   Specialisation (student_profiles.branch) → when blank, copy the former degree label
--     (e.g. Computer Science, Computer Science & Engineering) before degree is normalized.

WITH old_degree AS (
  SELECT
    sp.id,
    COALESCE(
      NULLIF(TRIM(sp.aux_profile->>'degreePursued'), ''),
      NULLIF(TRIM(sp.aux_profile->>'degree_pursued'), ''),
      NULLIF(TRIM(ed.degree), ''),
      NULLIF(TRIM(sp.department), ''),
      NULLIF(TRIM(sp.branch), '')
    ) AS prev_degree_label
  FROM student_profiles sp
  LEFT JOIN LATERAL (
    SELECT se.degree
    FROM student_education se
    WHERE se.student_id = sp.id
    ORDER BY se.start_year DESC NULLS LAST, se.created_at DESC
    LIMIT 1
  ) ed ON TRUE
)
UPDATE student_profiles sp
SET
  branch = CASE
    WHEN NULLIF(TRIM(sp.branch), '') IS NOT NULL THEN TRIM(sp.branch)
    WHEN NULLIF(TRIM(od.prev_degree_label), '') IS NOT NULL
      AND od.prev_degree_label !~* '^\s*b\.?\s*tech\b'
      AND od.prev_degree_label !~* '^\s*m\.?\s*tech\b'
      AND od.prev_degree_label !~* '^\s*b\.?\s*e\.?\b'
      AND od.prev_degree_label !~* '^\s*m\.?\s*e\.?\b'
      AND od.prev_degree_label !~* '^\s*mba\b'
      THEN TRIM(od.prev_degree_label)
    WHEN NULLIF(TRIM(sp.department), '') IS NOT NULL THEN TRIM(sp.department)
    ELSE sp.branch
  END,
  aux_profile = COALESCE(sp.aux_profile, '{}'::jsonb)
    || jsonb_build_object('degreePursued', 'B.Tech'),
  updated_at = NOW()
FROM old_degree od
WHERE sp.id = od.id;

UPDATE student_education
SET degree = 'B.Tech'
WHERE degree IS NULL
   OR TRIM(degree) = ''
   OR degree !~* '^\s*b\.?\s*tech\b';
