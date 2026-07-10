-- Sponsorship: one full payment per employer per tier (instalments removed from product logic).
UPDATE sponsorship_opportunities
SET payments_permitted = 1
WHERE payments_permitted IS DISTINCT FROM 1;
