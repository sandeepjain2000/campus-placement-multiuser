-- Event type for offer templates (Internship | Drive | Alumni Jobs)

ALTER TABLE employer_offer_templates
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(30) NOT NULL DEFAULT 'drive'
        CHECK (event_type IN ('internship', 'drive', 'alumni_jobs'));

CREATE INDEX IF NOT EXISTS idx_employer_offer_templates_event_type
    ON employer_offer_templates (employer_id, event_type)
    WHERE is_active = true;
