-- Internship postings: explicit start and end dates on job_postings.

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS internship_start_date DATE,
  ADD COLUMN IF NOT EXISTS internship_end_date DATE;

COMMENT ON COLUMN job_postings.internship_start_date IS 'Internship start date (internship job_type only).';
COMMENT ON COLUMN job_postings.internship_end_date IS 'Internship end date (internship job_type only).';
