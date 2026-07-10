-- Formal internship offer at selection (separate from PPO job offer after internship).

ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_offer_kind_check;

ALTER TABLE offers
    ADD CONSTRAINT offers_offer_kind_check
        CHECK (offer_kind IN ('standard', 'ppo_job', 'internship_offer'));
