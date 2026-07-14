-- =============================================================================
-- Hard-delete ALL job postings, internships/programs, placement drives, and
-- dependent pipeline data. Keeps tenants, users, students, employers, partnerships.
--
-- Run: npm run db:clear-placement
-- =============================================================================

-- Assessment uploads (job- or drive-scoped)
DELETE FROM employer_assessment_change_log;
DELETE FROM employer_assessment_rows;
DELETE FROM employer_assessment_rounds;
DELETE FROM employer_assessment_uploads;

-- Offers, shortlists, drive feedback, status history
DELETE FROM offers;
DELETE FROM shortlists;
DELETE FROM application_status_log;
DELETE FROM employer_ratings;

-- Program + drive applications (includes soft-deleted rows)
DELETE FROM program_applications;
DELETE FROM applications;

-- Drive structure + campus visibility on jobs
DELETE FROM drive_rounds;
DELETE FROM job_posting_visibility;

-- Calendar rows created for placement drives (no FK)
DELETE FROM college_calendar
WHERE event_type = 'placement_drive'
   OR description ILIKE '%placement drive%';

-- Demo purge ledger entries for removed entities
DELETE FROM demo_purge_transactions
WHERE entity_type IN (
  'job',
  'internship',
  'drive',
  'program_application',
  'drive_application'
);

-- Parent entities (includes soft-deleted rows)
DELETE FROM placement_drives;
DELETE FROM job_postings;

-- Students marked placed only via deleted pipeline
UPDATE student_profiles
SET placement_status = 'unplaced',
    updated_at = NOW()
WHERE placement_status = 'placed';

-- All in-app alerts (inbox + trash) — purge must leave Alerts empty
DELETE FROM notifications;
