# Runner alerts (2026-06-09)

> **Section:** Developer / QA  
> **Source:** developer  
> **Audience:** all

2026-06-09 — Cleanup & demo sandbox
Full reset: npm run db:clear-placement — removes all jobs, internships, drives (hard delete + cascades). Documented on /developer#cleanup.
After wipe: Developer Notes → Demo APIs → Restore all demo tie-ups (IITM / NITT / BITS × 5 employers).
Demo APIs and selective purge live on /developer#demo-apis (no separate landing panel).
Test colleges: py -3 scripts/delete_test_college_tenants.py — keeps only seed campuses.
Test employers: py -3 scripts/delete_test_employers.py — keeps 5 demo logins (TechCorp, GlobalSoft, Infosys, Innovent Labs, FinEdge); removes QA companies and cascades jobs, drives, CSV assessment uploads.
Employer tie-up Revoke button disabled (visible but not clickable).
