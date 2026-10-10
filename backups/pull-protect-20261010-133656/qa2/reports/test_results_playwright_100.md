# QA2 test execution results

| Field | Value |
|-------|-------|
| Results file | `playwright_results_20260517T164237Z.json` |
| Run ID | `20260517T164237Z` |
| Base URL | https://campus-placement-omega.vercel.app |
| Cases | 268 |
| Case offset | 0 |

## Pass/Fail summary

| Pass/Fail | Count |
|-----------|------:|
| PASS | 235 |
| FAIL | 33 |

> Playwright + NVIDIA verdict run — **Pass/Fail** from `pass_fail` / `verdict` in results JSON.

## All cases

| # | Test Case ID | Suite | Kind | Role | Route | Run Status | Pass/Fail | Notes | Tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | C1-BLOCK-223-COMP | A | companion | super_admin | /dashboard/college/offers-upload | completed | FAIL | [nvidia] super_admin accessed /dashboard/admin instead of /dashboard/college/offers-upload | 438 |
| 2 | C1-BLOCK-245-COMP | A | companion | super_admin | /dashboard/employer/projects | completed | FAIL | [nvidia] user reached forbidden route /dashboard/admin | 427 |
| 3 | C10-EDIT-001 | J | primary | student | /dashboard/student/profile | completed | PASS | [nvidia] All editable fields accept valid updates on /dashboard/student/profile | 338 |
| 4 | C10-EDIT-001-COMP | J | companion | student | /dashboard/student/profile | completed | PASS | [nvidia] All editable fields accept valid updates, no unauthorized validation blocks, saved values persist | 377 |
| 5 | C10-EDIT-002 | J | primary | employer | /dashboard/employer/profile | completed | PASS | [nvidia] All editable fields accept valid updates on /dashboard/employer/profile | 389 |
| 6 | C10-EDIT-002-COMP | J | companion | employer | /dashboard/employer/profile | completed | PASS | [nvidia] All editable fields accept valid updates, persisted state matches expectations | 421 |
| 7 | C10-EDIT-003 | J | primary | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] All editable fields accept valid updates | 362 |
| 8 | C10-EDIT-003-COMP | J | companion | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] All editable fields accept valid updates, no unauthorized validation blocks, and saved values persist. | 409 |
| 9 | C10-IMM-001 | J | primary | student | /dashboard/student/profile | completed | PASS | [nvidia] Immutable field is read-only in UI | 339 |
| 10 | C10-IMM-001-COMP | J | companion | student | /dashboard/student/profile | completed | PASS | [nvidia] Immutable field is read-only in UI | 374 |
| 11 | C10-IMM-002 | J | primary | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Immutable field is read-only in UI | 389 |
| 12 | C10-IMM-002-COMP | J | companion | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Target route loaded without runtime error on desktop and primary actions remain reachable on narrow mobile viewport | 435 |
| 13 | C10-IMM-003 | J | primary | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] Immutable field is read-only in UI | 368 |
| 14 | C10-IMM-003-COMP | J | companion | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] Immutable field is read-only in UI | 401 |
| 15 | C10-AWS-001 | J | primary | student | /dashboard/student/profile | completed | PASS | [nvidia] AWS-backed element upload/update succeeds | 338 |
| 16 | C10-AWS-001-COMP | J | companion | student | /dashboard/student/profile | completed | PASS | [nvidia] AWS-backed element upload/update succeeds with new asset reference visible in UI | 382 |
| 17 | C10-AWS-002 | J | primary | employer | /dashboard/employer/profile | completed | PASS | [nvidia] AWS-backed element upload/update succeeds | 416 |
| 18 | C10-AWS-002-COMP | J | companion | employer | /dashboard/employer/profile | completed | PASS | [nvidia] AWS-backed element upload/update succeeds, new asset reference persisted and visible in UI | 432 |
| 19 | C10-AWS-003 | J | primary | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] AWS-backed element upload/update succeeds | 367 |
| 20 | C10-AWS-003-COMP | J | companion | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] AWS-backed element upload/update succeeds on /dashboard/college/settings | 408 |
| 21 | C10-AUDIT-001 | J | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route | 381 |
| 22 | C10-AUDIT-001-COMP | J | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 417 |
| 23 | C11-DESIGN-001 | K | primary | student | /dashboard/layout | completed | FAIL | [nvidia] Layout spacing inconsistent with 8px grid | 388 |
| 24 | C11-DESIGN-001-COMP | K | companion | student | /dashboard/layout | completed | PASS | [nvidia] Target route /dashboard/layout loaded without runtime error | 403 |
| 25 | C11-DESIGN-002 | K | primary | college_admin | /dashboard/college/offers | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 405 |
| 26 | C11-DESIGN-002-COMP | K | companion | college_admin | /dashboard/college/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 428 |
| 27 | C11-DESIGN-003 | K | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design system elements observed | 347 |
| 28 | C11-DESIGN-003-COMP | K | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target route loaded without error | 354 |
| 29 | C11-DESIGN-004 | K | primary | college_admin | /dashboard/college/students | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 422 |
| 30 | C11-DESIGN-004-COMP | K | companion | college_admin | /dashboard/college/students | completed | PASS | [nvidia] Target route loaded without runtime error | 381 |
| 31 | C11-DESIGN-005 | K | primary | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 412 |
| 32 | C11-DESIGN-005-COMP | K | companion | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Target route loaded without runtime error | 426 |
| 33 | C11-DESIGN-006 | K | primary | college_admin | /dashboard/college/applications | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 407 |
| 34 | C11-DESIGN-006-COMP | K | companion | college_admin | /dashboard/college/applications | completed | PASS | [nvidia] Target route loaded without runtime error | 383 |
| 35 | C11-DESIGN-007 | K | primary | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows on /dashboard/college/drives | 408 |
| 36 | C11-DESIGN-007-COMP | K | companion | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Target route loaded without error, irreversible action not found | 382 |
| 37 | C11-DESIGN-008 | K | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 392 |
| 38 | C11-DESIGN-008-COMP | K | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target route loaded without runtime error | 411 |
| 39 | C11-DESIGN-009 | K | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows | 398 |
| 40 | C11-DESIGN-009-COMP | K | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target route loaded without runtime error | 406 |
| 41 | C11-DESIGN-010 | K | primary | college_admin | /dashboard/college/interviews | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows | 369 |
| 42 | C11-DESIGN-010-COMP | K | companion | college_admin | /dashboard/college/interviews | completed | PASS | [nvidia] Target route loaded without runtime error, helpful empty state for empty lists | 383 |
| 43 | C11-DESIGN-011 | K | primary | student | /dashboard/student/applications | completed | PASS | [nvidia] Visual density and spacing match a coherent design system (8px grid, consistent radii/shadows). | 412 |
| 44 | C11-DESIGN-011-COMP | K | companion | student | /dashboard/student/applications | completed | PASS | [nvidia] Target route loaded without runtime error | 426 |
| 45 | C11-DESIGN-012 | K | primary | student | /dashboard/student/offers | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design elements observed | 355 |
| 46 | C11-DESIGN-012-COMP | K | companion | student | /dashboard/student/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 361 |
| 47 | C11-DESIGN-013 | K | primary | student | /dashboard/student/profile | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 335 |
| 48 | C11-DESIGN-013-COMP | K | companion | student | /dashboard/student/profile | completed | PASS | [nvidia] Target route loaded without runtime error | 349 |
| 49 | C11-DESIGN-014 | K | primary | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 385 |
| 50 | C11-DESIGN-014-COMP | K | companion | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Target route loaded without runtime error, focus order is logical and actions remain activatable | 407 |
| 51 | C11-DESIGN-015 | K | primary | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 364 |
| 52 | C11-DESIGN-015-COMP | K | companion | college_admin | /dashboard/college/settings | completed | PASS | [nvidia] Target route loaded without runtime error, irreversible action confirmation exists | 381 |
| 53 | C11-DESIGN-016 | K | primary | college_admin | /dashboard/college/hiring-assessment | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows on /dashboard/college/hiring-assessment | 380 |
| 54 | C11-DESIGN-016-COMP | K | companion | college_admin | /dashboard/college/hiring-assessment | completed | PASS | [nvidia] Target route loaded without runtime error | 376 |
| 55 | C11-DESIGN-017 | K | primary | employer | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows | 401 |
| 56 | C11-DESIGN-017-COMP | K | companion | employer | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Target route loaded without error, user-facing validation confirmed | 413 |
| 57 | C11-DESIGN-018 | K | primary | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows | 407 |
| 58 | C11-DESIGN-018-COMP | K | companion | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Target route loaded without runtime error, helpful empty state confirmed | 419 |
| 59 | C11-DESIGN-019 | K | primary | college_admin | /dashboard/college/reports | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows on /dashboard/college/reports | 368 |
| 60 | C11-DESIGN-019-COMP | K | companion | college_admin | /dashboard/college/reports | completed | PASS | [nvidia] Target route loaded without runtime error on desktop and primary actions remain reachable on narrow mobile viewport | 380 |
| 61 | C11-DESIGN-020 | K | primary | college_admin | /dashboard/college/calendar | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows on /dashboard/college/calendar | 368 |
| 62 | C11-DESIGN-020-COMP | K | companion | college_admin | /dashboard/college/calendar | completed | PASS | [nvidia] Target route loaded without runtime error | 367 |
| 63 | C11-DESIGN-021 | K | primary | employer | /dashboard/employer/calendar | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent radii/shadows on /dashboard/employer/calendar | 426 |
| 64 | C11-DESIGN-021-COMP | K | companion | employer | /dashboard/employer/calendar | completed | PASS | [nvidia] Target route loaded without runtime error | 429 |
| 65 | C11-DESIGN-022 | K | primary | student | /dashboard/student/calendar | completed | PASS | [nvidia] Visual density and spacing match a coherent design system (8px grid, consistent radii/shadows). | 413 |
| 66 | C11-DESIGN-022-COMP | K | companion | student | /dashboard/student/calendar | completed | PASS | [nvidia] Target route loaded without runtime error | 415 |
| 67 | C11-DESIGN-023 | K | primary | student | /dashboard/alerts | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design system | 411 |
| 68 | C11-DESIGN-023-COMP | K | companion | student | /dashboard/alerts | completed | PASS | [nvidia] Target route loaded without runtime error | 420 |
| 69 | C11-DESIGN-024 | K | primary | student | /dashboard/feedback | completed | PASS | [nvidia] Visual density and spacing match a coherent design system | 394 |
| 70 | C11-DESIGN-024-COMP | K | companion | student | /dashboard/feedback | completed | PASS | [nvidia] Target route loaded without runtime error | 405 |
| 71 | C11-DESIGN-025 | K | primary | super_admin | /dashboard/admin/users | completed | PASS | [nvidia] Visual density and spacing consistent with 8px grid | 366 |
| 72 | C11-DESIGN-025-COMP | K | companion | super_admin | /dashboard/admin/users | completed | PASS | [nvidia] Target route loaded without runtime error | 423 |
| 73 | C11-DESIGN-026 | K | primary | super_admin | /dashboard/admin/colleges | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design elements | 420 |
| 74 | C11-DESIGN-026-COMP | K | companion | super_admin | /dashboard/admin/colleges | completed | PASS | [nvidia] Target route loaded without runtime error | 429 |
| 75 | C11-DESIGN-027 | K | primary | super_admin | /dashboard/admin/employers | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design elements | 415 |
| 76 | C11-DESIGN-027-COMP | K | companion | super_admin | /dashboard/admin/employers | completed | PASS | [nvidia] Target route loaded without runtime error on desktop and mobile viewports | 431 |
| 77 | C11-DESIGN-028 | K | primary | super_admin | /dashboard/admin/pending-registrations | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design system | 400 |
| 78 | C11-DESIGN-028-COMP | K | companion | super_admin | /dashboard/admin/pending-registrations | completed | PASS | [nvidia] Target route loaded without runtime error | 407 |
| 79 | C11-DESIGN-029 | K | primary | super_admin | /dashboard/admin/feedback | completed | PASS | [nvidia] Visual density and spacing match 8px grid, consistent design system | 407 |
| 80 | C11-DESIGN-029-COMP | K | companion | super_admin | /dashboard/admin/feedback | completed | PASS | [nvidia] Target route loaded without runtime error | 418 |
| 81 | C11-DESIGN-030 | K | primary | student | /dashboard/help | completed | FAIL | [nvidia] inconsistent spacing and radii on dashboard | 388 |
| 82 | C11-DESIGN-030-COMP | K | companion | student | /dashboard/help | completed | FAIL | [nvidia] student reached target route /dashboard/help without runtime error | 403 |
| 83 | C11-DESIGN-031 | K | primary | super_admin | /data-entry/users | completed | PASS | [nvidia] Target route loaded without runtime error, visual density and spacing match 8px grid | 335 |
| 84 | C11-DESIGN-031-COMP | K | companion | super_admin | /data-entry/users | completed | PASS | [nvidia] Target route loaded without runtime error, expected result observed | 345 |
| 85 | C11-AUDIT-001 | K | primary | student | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 378 |
| 86 | C11-AUDIT-001-COMP | K | companion | student | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 397 |
| 87 | C12-UC-001 | L | primary | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 420 |
| 88 | C12-UC-001-COMP | L | companion | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 455 |
| 89 | C12-UC-002 | L | primary | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 417 |
| 90 | C12-UC-002-COMP | L | companion | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 451 |
| 91 | C12-UC-003 | L | primary | student | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 406 |
| 92 | C12-UC-003-COMP | L | companion | student | /dashboard/student | completed | PASS | [nvidia] use case flow executes without blocking errors on desktop and mobile viewport | 445 |
| 93 | C12-UC-004 | L | primary | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 417 |
| 94 | C12-UC-004-COMP | L | companion | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error, all expected UI elements and data present | 457 |
| 95 | C12-UC-005 | L | primary | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 415 |
| 96 | C12-UC-005-COMP | L | companion | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error, expected use case flow executed successfully | 458 |
| 97 | C12-UC-006 | L | primary | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 415 |
| 98 | C12-UC-006-COMP | L | companion | employer | /dashboard/employer | completed | PASS | [nvidia] Target route loaded without runtime error | 449 |
| 99 | C12-UC-007 | L | primary | college_admin | /dashboard/college | completed | PASS | [nvidia] Target route loaded without runtime error | 431 |
| 100 | C12-UC-007-COMP | L | companion | college_admin | /dashboard/college | completed | PASS | [nvidia] Target route loaded without runtime error | 471 |
| 101 | C12-UC-008 | L | primary | college_admin | /dashboard/college | completed | PASS | [nvidia] Target route loaded without runtime error | 429 |
| 102 | C12-UC-008-COMP | L | companion | college_admin | /dashboard/college | completed | PASS | [nvidia] Target route loaded without runtime error | 467 |
| 103 | C12-UC-009 | L | primary | student | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 406 |
| 104 | C12-UC-009-COMP | L | companion | student | /dashboard/student | completed | PASS | [nvidia] Entire use case flow executes without blocking errors | 442 |
| 105 | C12-UC-010 | L | primary | super_admin | /dashboard/admin | completed | PASS | [nvidia] Target route loaded without runtime error | 406 |
| 106 | C12-UC-010-COMP | L | companion | super_admin | /dashboard/admin | completed | PASS | [nvidia] Target route loaded without runtime error, expected UI/data visible | 444 |
| 107 | C12-AUDIT-001 | L | primary | qa | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on /dashboard/student | 372 |
| 108 | C12-AUDIT-001-COMP | L | companion | qa | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 410 |
| 109 | C13-VIS-001 | M | primary | student | /dashboard/layout | completed | FAIL | [nvidia] Target screen did not open successfully at /dashboard/layout | 393 |
| 110 | C13-VIS-001-COMP | M | companion | student | /dashboard/layout | completed | FAIL | [nvidia] student reached /dashboard/student instead of /dashboard/layout | 401 |
| 111 | C13-VIS-002 | M | primary | student | /dashboard/student/overview | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 336 |
| 112 | C13-VIS-002-COMP | M | companion | student | /dashboard/student/overview | completed | PASS | [nvidia] Target route loaded without runtime error, sampled labels align with backing list | 424 |
| 113 | C13-VIS-003 | M | primary | student | /dashboard/student/profile | completed | PASS | [nvidia] Target screen opens successfully | 332 |
| 114 | C13-VIS-003-COMP | M | companion | student | /dashboard/student/profile | completed | PASS | [nvidia] Target route loaded without runtime error, focus order logical and actions activatable | 355 |
| 115 | C13-VIS-004 | M | primary | college_admin | /dashboard/college/overview | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 362 |
| 116 | C13-VIS-004-COMP | M | companion | college_admin | /dashboard/college/overview | completed | PASS | [nvidia] Target route loaded without runtime error | 374 |
| 117 | C13-VIS-005 | M | primary | college_admin | /dashboard/college/offers | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors | 406 |
| 118 | C13-VIS-005-COMP | M | companion | college_admin | /dashboard/college/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 430 |
| 119 | C13-VIS-006 | M | primary | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 396 |
| 120 | C13-VIS-006-COMP | M | companion | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Target route loaded without runtime error | 379 |
| 121 | C13-VIS-007 | M | primary | employer | /dashboard/employer/overview | completed | PASS | [nvidia] Target screen opens successfully | 337 |
| 122 | C13-VIS-007-COMP | M | companion | employer | /dashboard/employer/overview | completed | PASS | [nvidia] Target route loaded without runtime error | 417 |
| 123 | C13-VIS-008 | M | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target screen opens successfully | 387 |
| 124 | C13-VIS-008-COMP | M | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target route loaded without runtime error, primary actions reachable on narrow mobile viewport | 363 |
| 125 | C13-VIS-009 | M | primary | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 410 |
| 126 | C13-VIS-009-COMP | M | companion | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Target route loaded without runtime error | 420 |
| 127 | C13-VIS-010 | M | primary | super_admin | /dashboard/admin/overview | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 386 |
| 128 | C13-VIS-010-COMP | M | companion | super_admin | /dashboard/admin/overview | completed | PASS | [nvidia] Target route loaded without runtime error | 400 |
| 129 | C13-VIS-011 | M | primary | multi | /dashboard/alerts | completed | PASS | [nvidia] Target screen opens successfully | 405 |
| 130 | C13-VIS-011-COMP | M | companion | multi | /dashboard/alerts | completed | PASS | [nvidia] Target route loaded without runtime error, keyboard navigation logical | 424 |
| 131 | C13-VIS-012 | M | primary | multi | /dashboard/help | completed | FAIL | [nvidia] Target route /dashboard/help not loaded | 390 |
| 132 | C13-VIS-012-COMP | M | companion | multi | /dashboard/help | completed | FAIL | [nvidia] Navigated to unexpected route /dashboard/student instead of /dashboard/help | 406 |
| 133 | C13-VIS-013 | M | primary | public | /login | completed | FAIL | [nvidia] user reached target route /dashboard/student instead of /login | 393 |
| 134 | C13-VIS-013-COMP | M | companion | public | /login | completed | FAIL | [nvidia] Navigated to /dashboard/student instead of /login | 400 |
| 135 | C13-VIS-014 | M | primary | public | /register | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 353 |
| 136 | C13-VIS-014-COMP | M | companion | public | /register | completed | PASS | [nvidia] Target route loaded without runtime error, user was redirected to sign in page as expected | 376 |
| 137 | C13-VIS-015 | M | primary | public | /dashboard/student | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 390 |
| 138 | C13-VIS-015-COMP | M | companion | public | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 399 |
| 139 | C13-AUTO-001 | M | primary | qa_engineering | /app | completed | FAIL | [nvidia] Target screen does not open successfully due to 404 error | 298 |
| 140 | C13-AUTO-001-COMP | M | companion | qa_engineering | /app | completed | FAIL | [nvidia] 404 error on target route /app | 308 |
| 141 | C13-AUDIT-001 | M | primary | student | /dashboard/student | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 391 |
| 142 | C13-AUDIT-001-COMP | M | companion | student | /dashboard/student | completed | PASS | [nvidia] Target route loaded without runtime error | 398 |
| 143 | C3-TXN-001 | C | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target route loaded without runtime error | 400 |
| 144 | C3-TXN-001-COMP | C | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Transaction executes successfully without errors | 441 |
| 145 | C3-TXN-002 | C | primary | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target route loaded without runtime error | 413 |
| 146 | C3-TXN-002-COMP | C | companion | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Transaction executes successfully without errors | 447 |
| 147 | C3-TXN-003 | C | primary | student | /dashboard/student/applications | completed | PASS | [nvidia] Transaction executes successfully without errors | 418 |
| 148 | C3-TXN-003-COMP | C | companion | student | /dashboard/student/applications | completed | PASS | [nvidia] Transaction executes successfully without errors | 464 |
| 149 | C3-TXN-004 | C | primary | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Target route loaded without runtime error | 429 |
| 150 | C3-TXN-004-COMP | C | companion | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Transaction executes successfully without errors on desktop and mobile viewports | 469 |
| 151 | C3-TXN-005 | C | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Transaction executes successfully without errors | 409 |
| 152 | C3-TXN-005-COMP | C | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Transaction executes successfully without errors | 442 |
| 153 | C3-TXN-006 | C | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 359 |
| 154 | C3-TXN-006-COMP | C | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Transaction executes successfully without errors | 438 |
| 155 | C3-TXN-007 | C | primary | student | /dashboard/student/offers | completed | PASS | [nvidia] Transaction executes successfully without errors | 367 |
| 156 | C3-TXN-007-COMP | C | companion | student | /dashboard/student/offers | completed | PASS | [nvidia] Transaction executes successfully without errors | 402 |
| 157 | C3-TXN-008 | C | primary | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Target route loaded without runtime error | 419 |
| 158 | C3-TXN-008-COMP | C | companion | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Target route loaded without runtime error | 452 |
| 159 | C3-TXN-009 | C | primary | college_admin | /dashboard/college/offers-upload | completed | PASS | [nvidia] Target route loaded without runtime error | 445 |
| 160 | C3-TXN-009-COMP | C | companion | college_admin | /dashboard/college/offers-upload | completed | PASS | [nvidia] Transaction executes successfully without errors | 454 |
| 161 | C3-TXN-010 | C | primary | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Target route loaded without runtime error | 427 |
| 162 | C3-TXN-010-COMP | C | companion | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Transaction executes successfully without errors | 461 |
| 163 | C3-TXN-011 | C | primary | college_admin | /dashboard/college/calendar | completed | PASS | [nvidia] Transaction executes successfully without errors | 373 |
| 164 | C3-TXN-011-COMP | C | companion | college_admin | /dashboard/college/calendar | completed | PASS | [nvidia] Transaction executed successfully without errors, persisted after page refresh and visible in all intended locations. | 420 |
| 165 | C3-TXN-012 | C | primary | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Target route loaded without runtime error | 381 |
| 166 | C3-TXN-012-COMP | C | companion | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Transaction executes successfully without errors on /dashboard/college/clarifications | 423 |
| 167 | C4-ALL-001 | D | primary | all_roles | /dashboard/alerts | completed | FAIL | [nvidia] TimeoutError: Timeout 45000ms exceeded while loading /dashboard/alerts | 407 |
| 168 | C4-ALL-001-COMP | D | companion | all_roles | /dashboard/alerts | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/alerts | 437 |
| 169 | C4-ALL-002 | D | primary | all_roles | /dashboard/feedback | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/feedback | 401 |
| 170 | C4-ALL-002-COMP | D | companion | all_roles | /dashboard/feedback | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/feedback | 434 |
| 171 | C4-ALL-003 | D | primary | all_roles | /dashboard/my-exports | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/my-exports | 403 |
| 172 | C4-ALL-003-COMP | D | companion | all_roles | /dashboard/my-exports | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/my-exports | 440 |
| 173 | C5-AUDIT-001 | E | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 396 |
| 174 | C5-AUDIT-001-COMP | E | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 431 |
| 175 | C6-GAP-001 | F | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 387 |
| 176 | C6-GAP-001-COMP | F | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 424 |
| 177 | C7-EMAIL-001 | G | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Email delivered to recipient with correct content | 383 |
| 178 | C7-EMAIL-001-COMP | G | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Email delivered to recipient mailbox, no duplicates or wrong recipients | 422 |
| 179 | C7-EMAIL-002 | G | primary | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Email delivered to recipient with correct content | 396 |
| 180 | C7-EMAIL-002-COMP | G | companion | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Email delivered to recipient, no duplicates or wrong recipients found | 405 |
| 181 | C7-EMAIL-003 | G | primary | student | /dashboard/student/drives | completed | PASS | [nvidia] Email delivered to recipient, content corresponds to transaction | 403 |
| 182 | C7-EMAIL-003-COMP | G | companion | student | /dashboard/student/drives | completed | PASS | [nvidia] Email delivered to recipient, persisted state matches expectations | 436 |
| 183 | C7-EMAIL-004 | G | primary | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Email delivered to recipient, no duplicates or wrong recipients found | 416 |
| 184 | C7-EMAIL-004-COMP | G | companion | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Email delivered to recipient with correct content | 448 |
| 185 | C7-EMAIL-005 | G | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Email delivered to recipient without errors | 392 |
| 186 | C7-EMAIL-005-COMP | G | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Email delivered to recipient, content matches transaction | 429 |
| 187 | C7-EMAIL-006 | G | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Email delivered to recipient with correct content | 390 |
| 188 | C7-EMAIL-006-COMP | G | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Email delivered to recipient, content corresponds to transaction | 428 |
| 189 | C7-EMAIL-007 | G | primary | student | /dashboard/student/offers | completed | PASS | [nvidia] Email delivered to recipient mailbox without errors | 351 |
| 190 | C7-EMAIL-007-COMP | G | companion | student | /dashboard/student/offers | completed | PASS | [nvidia] Email delivered to intended recipient mailbox, content corresponds to executed transaction. | 390 |
| 191 | C7-EMAIL-008 | G | primary | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Email delivered to recipient with correct content | 410 |
| 192 | C7-EMAIL-008-COMP | G | companion | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Email delivered to recipient, content matches transaction, no duplicates or wrong recipients. | 455 |
| 193 | C7-EMAIL-009 | G | primary | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Email delivered to recipient mailbox without errors | 364 |
| 194 | C7-EMAIL-009-COMP | G | companion | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Email delivered to recipient, content correct, no duplicates or wrong recipients | 405 |
| 195 | C7-PREF-001 | G | primary | student | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 400 |
| 196 | C7-PREF-001-COMP | G | companion | student | /dashboard/alerts | completed | PASS | [nvidia] Target route loaded without runtime error, preference control exists and persists | 437 |
| 197 | C7-PREF-002 | G | primary | employer | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 377 |
| 198 | C7-PREF-002-COMP | G | companion | employer | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 410 |
| 199 | C7-PREF-003 | G | primary | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 412 |
| 200 | C7-PREF-003-COMP | G | companion | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 448 |
| 201 | C7-PREF-004 | G | primary | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 412 |
| 202 | C7-PREF-004-COMP | G | companion | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control exists and persists on /dashboard/alerts | 447 |
| 203 | C7-PREF-005 | G | primary | super_admin | /dashboard/admin/settings | completed | PASS | [nvidia] Preference control exists and persists on dashboard | 378 |
| 204 | C7-PREF-005-COMP | G | companion | super_admin | /dashboard/admin/settings | completed | PASS | [nvidia] Preference control exists and persists on target route /dashboard/admin/settings | 419 |
| 205 | C7-AUDIT-001 | G | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on /dashboard/student | 375 |
| 206 | C7-AUDIT-001-COMP | G | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 410 |
| 207 | C8-ALERT-001 | H | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 398 |
| 208 | C8-ALERT-001-COMP | H | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content and no visibility for unauthorized roles | 432 |
| 209 | C8-ALERT-002 | H | primary | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 402 |
| 210 | C8-ALERT-002-COMP | H | companion | college_admin | /dashboard/college/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) and matches transaction context | 408 |
| 211 | C8-ALERT-003 | H | primary | student | /dashboard/student/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) and matches transaction context | 408 |
| 212 | C8-ALERT-003-COMP | H | companion | student | /dashboard/student/drives | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content and no unauthorized access | 446 |
| 213 | C8-ALERT-004 | H | primary | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 418 |
| 214 | C8-ALERT-004-COMP | H | companion | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with correct content and visibility | 453 |
| 215 | C8-ALERT-005 | H | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 399 |
| 216 | C8-ALERT-005-COMP | H | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 435 |
| 217 | C8-ALERT-006 | H | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 396 |
| 218 | C8-ALERT-006-COMP | H | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 431 |
| 219 | C8-ALERT-007 | H | primary | student | /dashboard/student/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 396 |
| 220 | C8-ALERT-007-COMP | H | companion | student | /dashboard/student/offers | completed | PASS | [nvidia] Alert entry created for intended viewer(s) on dashboard | 436 |
| 221 | C8-ALERT-008 | H | primary | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 416 |
| 222 | C8-ALERT-008-COMP | H | companion | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Alert entry created for employer on intended campus | 446 |
| 223 | C8-ALERT-009 | H | primary | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Alert entry created for intended viewer(s) with matching content | 370 |
| 224 | C8-ALERT-009-COMP | H | companion | college_admin | /dashboard/college/clarifications | completed | PASS | [nvidia] Alert entry created for intended viewer(s) and matches transaction context | 408 |
| 225 | C8-PREF-001 | H | primary | student | /dashboard/alerts | completed | PASS | [nvidia] Preference control is available and persists after refresh/login | 412 |
| 226 | C8-PREF-001-COMP | H | companion | student | /dashboard/alerts | completed | PASS | [nvidia] Preference control available and persists after refresh/login | 446 |
| 227 | C8-PREF-002 | H | primary | employer | /dashboard/alerts | completed | PASS | [nvidia] Preference control persists after refresh/login | 386 |
| 228 | C8-PREF-002-COMP | H | companion | employer | /dashboard/alerts | completed | PASS | [nvidia] Preference control is available and persists after refresh/login | 424 |
| 229 | C8-PREF-003 | H | primary | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control available and persists after refresh/login | 423 |
| 230 | C8-PREF-003-COMP | H | companion | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control persisted after refresh/login and matched expectations | 457 |
| 231 | C8-PREF-004 | H | primary | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control persists after refresh/login | 421 |
| 232 | C8-PREF-004-COMP | H | companion | college_admin | /dashboard/alerts | completed | PASS | [nvidia] Preference control available and persists after refresh/login | 459 |
| 233 | C8-PREF-005 | H | primary | super_admin | /dashboard/admin/settings | completed | PASS | [nvidia] Preference control is available and persists after refresh/login | 335 |
| 234 | C8-PREF-005-COMP | H | companion | super_admin | /dashboard/admin/settings | completed | PASS | [nvidia] Preference control is available and persists after refresh/login | 428 |
| 235 | C8-AUDIT-001 | H | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 377 |
| 236 | C8-AUDIT-001-COMP | H | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError: Timeout 45000ms exceeded on login page | 417 |
| 237 | C9-CRUDV-001 | I | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target route loaded without runtime error | 392 |
| 238 | C9-CRUDV-001-COMP | I | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target route loaded without runtime error, expected functionality observed | 429 |
| 239 | C9-CRUDV-002 | I | primary | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target route loaded without runtime error | 405 |
| 240 | C9-CRUDV-002-COMP | I | companion | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target route loaded without runtime error, expected functionality observed | 446 |
| 241 | C9-CRUDV-003 | I | primary | student | /dashboard/student/applications | completed | PASS | [nvidia] Target route loaded without runtime error, expected functionality observed | 415 |
| 242 | C9-CRUDV-003-COMP | I | companion | student | /dashboard/student/applications | completed | PASS | [nvidia] Add works and record is persisted, view shows latest saved record, edit updates are reflected correctly, delete allowed | 476 |
| 243 | C9-CRUDV-004 | I | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target route loaded without runtime error | 402 |
| 244 | C9-CRUDV-004-COMP | I | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target route loaded without runtime error, expected functionality observed | 441 |
| 245 | C9-CRUDV-005 | I | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target route loaded without runtime error, expected functionality observed | 355 |
| 246 | C9-CRUDV-005-COMP | I | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Add works and record is persisted, view shows latest saved record, edit updates are reflected correctly, delete is allow | 452 |
| 247 | C9-CANCEL-DELETE-001 | I | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Cancel preserves record, delete removes from non-admin UI | 409 |
| 248 | C9-CANCEL-DELETE-001-COMP | I | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Cancel preserves record, delete removes from non-admin UI | 436 |
| 249 | C9-CANCEL-DELETE-002 | I | primary | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 403 |
| 250 | C9-CANCEL-DELETE-002-COMP | I | companion | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Cancel preserves record, delete removes from non-admin UI | 439 |
| 251 | C9-CANCEL-DELETE-003 | I | primary | student | /dashboard/student/applications | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 409 |
| 252 | C9-CANCEL-DELETE-003-COMP | I | companion | student | /dashboard/student/applications | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 456 |
| 253 | C9-CANCEL-DELETE-004 | I | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 400 |
| 254 | C9-CANCEL-DELETE-004-COMP | I | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Cancel preserves record, delete removes from non-admin UI, super admin retains visibility | 439 |
| 255 | C9-CANCEL-DELETE-005 | I | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 349 |
| 256 | C9-CANCEL-DELETE-005-COMP | I | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Cancel does not remove record from normal role visibility | 386 |
| 257 | C9-ALERT-IMPACT-001 | I | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target route loaded without runtime error, alert message is role-appropriate and context-rich | 420 |
| 258 | C9-ALERT-IMPACT-001-COMP | I | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Impact alert propagated correctly to employer role | 437 |
| 259 | C9-ALERT-IMPACT-002 | I | primary | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target route loaded without runtime error | 405 |
| 260 | C9-ALERT-IMPACT-002-COMP | I | companion | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Alerts displayed for impacted users, role-appropriate and context-rich | 447 |
| 261 | C9-ALERT-IMPACT-003 | I | primary | student | /dashboard/student/applications | completed | PASS | [nvidia] Impacted users receive alert for cancel/delete impact | 414 |
| 262 | C9-ALERT-IMPACT-003-COMP | I | companion | student | /dashboard/student/applications | completed | PASS | [nvidia] Impacted users receive alert for cancel/delete impact | 458 |
| 263 | C9-ALERT-IMPACT-004 | I | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target route loaded without runtime error | 402 |
| 264 | C9-ALERT-IMPACT-004-COMP | I | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target route loaded without runtime error, impacted users receive alert for cancel/delete impact | 447 |
| 265 | C9-ALERT-IMPACT-005 | I | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target route loaded without runtime error | 351 |
| 266 | C9-ALERT-IMPACT-005-COMP | I | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Impact alert propagated correctly to impacted users with role-appropriate message | 440 |
| 267 | C9-AUDIT-001 | I | primary | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 384 |
| 268 | C9-AUDIT-001-COMP | I | companion | all_roles | /dashboard/student | completed | FAIL | [nvidia] TimeoutError on target route /dashboard/student | 420 |