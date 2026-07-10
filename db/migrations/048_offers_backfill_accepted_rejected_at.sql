-- Rows imported or edited with status accepted/rejected before timestamps were written.
UPDATE offers
SET accepted_at = COALESCE(accepted_at, updated_at, created_at)
WHERE status = 'accepted' AND accepted_at IS NULL;

UPDATE offers
SET rejected_at = COALESCE(rejected_at, updated_at, created_at)
WHERE status = 'rejected' AND rejected_at IS NULL;
