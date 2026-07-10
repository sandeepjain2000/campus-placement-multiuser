-- Employer-level default round display names per opportunity type (Assessment map).

CREATE TABLE IF NOT EXISTS employer_assessment_round_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  opportunity_kind TEXT NOT NULL CHECK (opportunity_kind IN ('internship', 'jobs', 'drive', 'projects')),
  round_no INTEGER NOT NULL CHECK (round_no BETWEEN 1 AND 5),
  round_label VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (employer_id, opportunity_kind, round_no)
);

CREATE INDEX IF NOT EXISTS idx_employer_assessment_round_defaults_employer
  ON employer_assessment_round_defaults(employer_id);
