-- Drop the strict foreign key constraint on application_id so it can polymorphically reference either applications or program_applications.
ALTER TABLE employer_assessment_rows
  DROP CONSTRAINT IF EXISTS employer_assessment_rows_application_id_fkey;
