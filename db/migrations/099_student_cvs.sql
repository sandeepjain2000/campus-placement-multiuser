-- Student CVs: labelled résumés per application; archive-only (no delete).

CREATE TABLE IF NOT EXISTS student_cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    label VARCHAR(20) NOT NULL CHECK (char_length(trim(label)) >= 1),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    original_file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_cvs_student ON student_cvs (student_id);
CREATE INDEX IF NOT EXISTS idx_student_cvs_student_active
    ON student_cvs (student_id) WHERE archived_at IS NULL;

ALTER TABLE program_applications
    ADD COLUMN IF NOT EXISTS student_cv_id UUID REFERENCES student_cvs(id) ON DELETE SET NULL;

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS student_cv_id UUID REFERENCES student_cvs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_program_applications_cv ON program_applications (student_cv_id);
CREATE INDEX IF NOT EXISTS idx_applications_cv ON applications (student_cv_id);

-- Backfill from existing résumé documents (one row per document).
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

-- Ensure at least one default per student with CV rows.
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
