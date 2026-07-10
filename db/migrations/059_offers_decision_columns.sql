-- Ensure student accept/decline PATCH can persist decision timestamps on older databases.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Normalize legacy status values that block the pending check constraint path.
UPDATE offers SET status = 'rejected' WHERE LOWER(TRIM(status)) IN ('declined', 'decline', 'reject');
