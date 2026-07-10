-- CV verification: college (or delegated placement committee) marks each uploaded CV verified.

ALTER TABLE student_cvs
    ADD COLUMN IF NOT EXISTS cv_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cv_verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_cvs_verified_active
    ON student_cvs (student_id, cv_verified_at)
    WHERE archived_at IS NULL AND cv_verified_at IS NOT NULL;
