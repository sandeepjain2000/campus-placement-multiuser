-- Support richer student self-profile edit sections.

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS diploma_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS backlogs_active INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backlogs_history INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aux_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS student_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tech_stack TEXT[],
  project_url VARCHAR(255),
  github_url VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_projects_student ON student_projects(student_id);
