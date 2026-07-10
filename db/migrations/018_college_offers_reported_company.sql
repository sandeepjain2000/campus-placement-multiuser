-- College-recorded offers (email / external rollouts) may not map to an employer_profiles row.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS reported_company_name VARCHAR(255);

COMMENT ON COLUMN offers.reported_company_name IS 'Company name when college logs an offer without a linked employer account; use with employer_id NULL.';
