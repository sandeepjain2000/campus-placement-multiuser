-- =============================================================================
-- Hard-delete ALL job postings, internships/programs, placement drives, and
-- dependent pipeline data. Also clears notifications + audit_logs,
-- sponsorship / startup-funding payment transactions (keeps opportunity catalogs),
-- demo logs/feedback (mail delivery, platform errors, support messages,
-- feedback, feature ideas, semester rollover runs), and imported calendar events
-- (college_calendar.source_uid set; manual calendar rows kept).
-- Non-core (test) college tenants and tester-created students are deleted by
-- clear_all_placement_data.js (keeps seed campuses + core demo students/alumni
-- from /demo-accounts: Arjun, Sneha Rao, Rohan Mehta, Priya Sharma alumni).
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

-- Calendar rows for placement drives + ICS/imported events (source_uid set).
-- Manually created campus events (source_uid NULL) are kept.
DELETE FROM college_calendar
WHERE event_type = 'placement_drive'
   OR description ILIKE '%placement drive%'
   OR (source_uid IS NOT NULL AND length(btrim(source_uid)) > 0);

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

-- Sponsorship / startup funding payment transactions
-- (receipt send rows cascade from payments; delete sends first for clarity)
-- Opportunity catalogs (tiers) are kept so campuses remain browsable.
DELETE FROM sponsorship_donation_receipt_sends;
DELETE FROM sponsorship_payment_error_logs;
DELETE FROM sponsorship_payments;
DELETE FROM startup_funding_receipt_sends;
DELETE FROM startup_funding_payments;

-- Students marked placed only via deleted pipeline
UPDATE student_profiles
SET placement_status = 'unplaced',
    updated_at = NOW()
WHERE placement_status = 'placed';

-- All in-app alerts (inbox + trash) — purge must leave Alerts empty
DELETE FROM notifications;

-- Audit reports trail — purge must leave Audit logs empty
DELETE FROM audit_logs;

-- Demo / QA logs & feedback (clean slate for outbound mail, errors, support,
-- feedback, ideas, rollover). Skip quietly when a table is not migrated yet.
DO $$ BEGIN DELETE FROM mail_delivery_logs; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM platform_error_logs; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM login_support_messages; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM platform_feedback_replies; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM platform_feedback; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM feature_idea_votes; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM feature_ideas; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM tenant_semester_rollover_adjustments; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM tenant_semester_rollover_runs; EXCEPTION WHEN undefined_table THEN NULL; END $$;
