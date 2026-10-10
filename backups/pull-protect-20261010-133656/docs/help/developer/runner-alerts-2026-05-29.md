# Runner alerts (2026-05-29)

> **Section:** Developer / QA  
> **Source:** developer  
> **Audience:** all

2026-05-29 — Recruitment & assessment UI
Placement drive playbooks: npm run test:guided:playbook-drives-e2e (full cycle), playbook-drives (request + approve), playbook-drives-apply (apply + select). CSV on drives is still manual.
Assessment uploads (CSV) — tabs Internship / Jobs / Drive / Projects; Export CSV per tab (all applications, same columns as import); CSV upload only (no mapping dialog); round display names from Assessment map.
Assessment Update Online — new screen below CSV uploads; tabbed application table with inline round edits.
Hiring Results Dashboard — read-only employer view (was Hiring Assessment); tabbed by opportunity type.
Assessment map — configure round labels per kind under Settings (used by CSV upload and online update).
Offer CSV import removed — employers use Offer templates + bulk generate; colleges use manual Add offer. Legacy /offers-upload URLs redirect to Offers.
Purge test data — removed from employer/college login menus; super-admin only on /data-entry.
After dashboardMenu.js edits run: npm run qa:sync-routes
