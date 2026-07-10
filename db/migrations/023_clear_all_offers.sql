-- =============================================================================
-- Clear every row in public.offers so you can re-import from CSV / app.
--
-- There is no is_recent column; history is tracked via is_latest (0/1) per
-- student + company chain. After a full delete, re-imported rows will get
-- is_latest = 1 from INSERT defaults until refreshOfferLatestFlagsForStudent runs.
--
-- WARNING: Destructive. No other tables in this schema reference offers.id, but
-- rows lose link to application_id / drive_id / audit context. Back up first if unsure.
--
-- Run: psql "$DATABASE_URL" -f db/migrations/023_clear_all_offers.sql
-- =============================================================================

DELETE FROM offers;

-- Optional: if you prefer TRUNCATE (faster on huge tables, same effect here):
-- TRUNCATE TABLE offers;
