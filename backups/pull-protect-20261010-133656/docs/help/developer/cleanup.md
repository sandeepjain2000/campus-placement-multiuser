# Clean up & restore test data

> **Section:** Developer / QA  
> **Source:** developer  
> **Audience:** all

After testing, wipe all jobs, internships, and placement drives, clear Alerts/Audit logs, remove non-core test colleges, and delete tester-created students. Core seed campuses (IITM / NITT / BITS + Jadavpur / VIT / DTU / IIIT-H), core demo students/alumni (Arjun / Sneha / Rohan / Priya alumni), and demo employer logins stay intact.

Wipe & selective cleanup:
- Full wipe — all jobs, internships, drives (recommended)
  Command: npm run db:clear-placement
  Alt: node scripts/clear_all_placement_data.js
  Hard-deletes every job posting (jobs + internships + projects + hackathons), all placement drives, applications, campus visibility, offers, assessment uploads, Alerts, and Audit logs. Also deletes non-core colleges created for testing (keeps seed campuses: IITM, NITT, BITS, Jadavpur, VIT, DTU, IIIT-H) and every student except the four core demo accounts on /demo-accounts (Arjun Verma, Sneha Rao, Rohan Mehta, Priya Sharma alumni). Does not remove core college/employer logins.
  When: Clean slate before a demo or after a long QA session.
- Soft-delete jobs & internships only (UI)
  Command: Developer Notes → Demo APIs → Jobs & internships → Delete all jobs & internships
  Alt: POST /api/demo/purge-all-jobs-internships
  Marks job postings deleted in DB; may miss standalone drives. Prefer npm run db:clear-placement for a full reset.
  When: Quick partial cleanup from Developer Notes.
- Selective purge (one entity at a time)
  Command: Developer Notes → Demo APIs → Purge (soft delete)
  Alt: /data-entry → Purge section
  Soft-delete single sandbox rows: Data Tester API posts, GT-* titles, playbook Duration: N months. descriptions, seed ids d1000000-*.
  When: Remove one bad test row without wiping everything.
- Remove test college tenants only (registration QA)
  Command: py -3 scripts/delete_test_college_tenants.py --dry-run
  Alt: py -3 scripts/delete_test_college_tenants.py
  Standalone college cleanup (also included in npm run db:clear-placement). Deletes non-seed campuses from registration tests. Keeps seed campuses. Cascades users, visibility, and drives for those tenants.
  When: College admin list is cluttered and you do not want a full placement wipe.
- Remove test employers (keep 5 demo logins)
  Command: py -3 scripts/delete_test_employers.py --dry-run
  Alt: py -3 scripts/delete_test_employers.py  |  npm run db:delete-test-employers
  Deletes every employer profile except hr@techcorp.com, hr@globalsoft.com, hr@infosys.com, talent@innoventlabs.ai, and careers@finedge.io. Cascades jobs, drives, tie-ups, offers, assessment CSV upload history (uploads, rows, import sessions), and Assessment Update Online contexts. Also removes orphan employer users from registration QA. Run without --dry-run to apply.
  When: Employer list is cluttered with test companies not on /demo-accounts.

Restore after cleanup:
- Restore demo campus ↔ employer tie-ups
  Developer Notes → Demo APIs → Campus tie-ups → Restore all demo tie-ups
  Alt: POST /api/demo/ensure-all-tieups  body: { "scope": "demo" }
  Approves IIT Madras, NITT Trichy, and BITS Pilani with TechCorp, GlobalSoft, Infosys, Innovent Labs, and FinEdge. Safe to re-run.
- TechCorp only — all active colleges
  npm run qa:ensure-techcorp-partnerships
  Alt: node scripts/db_exec_sql_file.js db/seeds/ensure_techcorp_partnerships.sql
  Upserts approved tie-ups for hr@techcorp.com with every active college tenant. Use when TechCorp shows no approved campuses, internship publish fails, or Applications → Internships shows partnership errors. Safe to re-run.
- Seed fresh postings (optional)
  Developer Notes → Demo APIs → Create jobs / Create internships
  Alt: /data-entry → Jobs & internships section
  Creates new published listings with campus visibility after tie-ups are restored.
- All colleges × all employers (full grid)
  POST /api/demo/ensure-all-tieups  body: { "scope": "all" }
  Alt: npm run qa:ensure-partnership
  Only if you need every employer approved on every active college — not required for standard demo.
