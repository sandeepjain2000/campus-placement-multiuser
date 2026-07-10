-- One formal internship selection offer per program application (prevents duplicate offer rows + emails).

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_one_internship_selection_per_application
  ON offers (program_application_id)
  WHERE program_application_id IS NOT NULL
    AND COALESCE(offer_kind, 'standard') IN ('standard', 'internship_offer')
    AND COALESCE(is_deleted, false) = false;
