-- Reset all employer–campus tie-ups (fresh start: zero requests/approvals).
-- Seed data no longer inserts into employer_approvals; run this on existing DBs once.
-- WARNING: Deletes every row in employer_approvals (dev/demo reset).

DELETE FROM employer_approvals;
