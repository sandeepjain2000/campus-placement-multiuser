# QA2 test execution results

| Field | Value |
|-------|-------|
| Results file | `playwright_results_20260517T143150Z.json` |
| Run ID | `20260517T143150Z` |
| Base URL | https://campus-placement-omega.vercel.app |
| Cases | 100 |
| Case offset | 100 |

## Pass/Fail summary

| Pass/Fail | Count |
|-----------|------:|
| PASS | 100 |

> Playwright + NVIDIA verdict run — **Pass/Fail** from `pass_fail` / `verdict` in results JSON.

## All cases

| # | Test Case ID | Suite | Kind | Role | Route | Run Status | Pass/Fail | Notes | Tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | C1-BLOCK-051 | A | primary | student | /dashboard/employer/calendar | completed | PASS | [nvidia] Student redirected to role-appropriate screen /dashboard/student | 398 |
| 2 | C1-BLOCK-051-COMP | A | companion | student | /dashboard/employer/calendar | completed | PASS | [nvidia] Student denied access to employer dashboard calendar | 429 |
| 3 | C1-BLOCK-052 | A | primary | student | /dashboard/employer/campus-guest-needs | completed | PASS | [nvidia] Student redirected to /dashboard/student as expected | 401 |
| 4 | C1-BLOCK-052-COMP | A | companion | student | /dashboard/employer/campus-guest-needs | completed | PASS | [nvidia] Student denied access to /dashboard/employer/campus-guest-needs | 439 |
| 5 | C1-BLOCK-053 | A | primary | student | /dashboard/employer/discussions | completed | PASS | [nvidia] Student redirected to role-appropriate screen /dashboard/student | 399 |
| 6 | C1-BLOCK-053-COMP | A | companion | student | /dashboard/employer/discussions | completed | PASS | [nvidia] Student redirected to role-appropriate dashboard | 428 |
| 7 | C1-BLOCK-054 | A | primary | student | /dashboard/employer/drives | completed | PASS | [nvidia] Student redirected from /dashboard/employer/drives to /dashboard/student | 402 |
| 8 | C1-BLOCK-054-COMP | A | companion | student | /dashboard/employer/drives | completed | PASS | [nvidia] student redirected to /dashboard/student | 425 |
| 9 | C1-BLOCK-055 | A | primary | student | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Student redirected to role-appropriate screen | 398 |
| 10 | C1-BLOCK-055-COMP | A | companion | student | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Student redirected from /dashboard/employer/hiring-assessment to /dashboard/student | 439 |
| 11 | C1-BLOCK-056 | A | primary | student | /dashboard/employer/internships | completed | PASS | [nvidia] student redirected to /dashboard/student as expected | 398 |
| 12 | C1-BLOCK-056-COMP | A | companion | student | /dashboard/employer/internships | completed | PASS | [nvidia] Student denied access to employer internships | 429 |
| 13 | C1-BLOCK-057 | A | primary | student | /dashboard/employer/interviews | completed | PASS | [nvidia] Student redirected to role-appropriate screen | 397 |
| 14 | C1-BLOCK-057-COMP | A | companion | student | /dashboard/employer/interviews | completed | PASS | [nvidia] Student denied access to employer dashboard | 429 |
| 15 | C1-BLOCK-058 | A | primary | student | /dashboard/employer/jobs | completed | PASS | [nvidia] Student redirected to role-appropriate screen | 396 |
| 16 | C1-BLOCK-058-COMP | A | companion | student | /dashboard/employer/jobs | completed | PASS | [nvidia] student redirected to /dashboard/student as expected | 427 |
| 17 | C1-BLOCK-059 | A | primary | student | /dashboard/employer/offers | completed | PASS | [nvidia] Student redirected to role-appropriate dashboard | 396 |
| 18 | C1-BLOCK-059-COMP | A | companion | student | /dashboard/employer/offers | completed | PASS | [nvidia] Student denied access to /dashboard/employer/offers | 433 |
| 19 | C1-BLOCK-060 | A | primary | student | /dashboard/employer/offers-upload | completed | PASS | [nvidia] Student redirected to role-appropriate screen /dashboard/student | 400 |
| 20 | C1-BLOCK-060-COMP | A | companion | student | /dashboard/employer/offers-upload | completed | PASS | [nvidia] Student denied access to /dashboard/employer/offers-upload | 433 |
| 21 | C1-BLOCK-061 | A | primary | student | /dashboard/employer/overview | completed | PASS | [nvidia] student denied access to /dashboard/employer/overview | 399 |
| 22 | C1-BLOCK-061-COMP | A | companion | student | /dashboard/employer/overview | completed | PASS | [nvidia] Student redirected to role-appropriate screen /dashboard/student | 431 |
| 23 | C1-BLOCK-062 | A | primary | student | /dashboard/employer/profile | completed | PASS | [nvidia] Student redirected to student dashboard as expected | 395 |
| 24 | C1-BLOCK-062-COMP | A | companion | student | /dashboard/employer/profile | completed | PASS | [nvidia] student redirected from /dashboard/employer/profile to /dashboard/student | 430 |
| 25 | C1-BLOCK-063 | A | primary | student | /dashboard/employer/projects | completed | PASS | [nvidia] student redirected to /dashboard/student | 394 |
| 26 | C1-BLOCK-063-COMP | A | companion | student | /dashboard/employer/projects | completed | PASS | [nvidia] User redirected to /dashboard/student as expected | 429 |
| 27 | C1-BLOCK-064 | A | primary | student | /dashboard/employer/select-campus | completed | PASS | [nvidia] Student redirected to /dashboard/student as expected | 397 |
| 28 | C1-BLOCK-064-COMP | A | companion | student | /dashboard/employer/select-campus | completed | PASS | [nvidia] Student redirected from /dashboard/employer/select-campus to /dashboard/student | 434 |
| 29 | C1-BLOCK-065 | A | primary | student | /dashboard/employer/sponsorships | completed | PASS | [nvidia] Student successfully redirected from /dashboard/employer/sponsorships to /dashboard/student | 405 |
| 30 | C1-BLOCK-065-COMP | A | companion | student | /dashboard/employer/sponsorships | completed | PASS | [nvidia] Student denied access to /dashboard/employer/sponsorships | 434 |
| 31 | C1-VISIT-066 | A | primary | employer | /dashboard/alerts | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors | 337 |
| 32 | C1-VISIT-066-COMP | A | companion | employer | /dashboard/alerts | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors or crash | 421 |
| 33 | C1-VISIT-067 | A | primary | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 411 |
| 34 | C1-VISIT-067-COMP | A | companion | employer | /dashboard/employer/applications | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 449 |
| 35 | C1-VISIT-068 | A | primary | employer | /dashboard/employer/assessment-summary | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 403 |
| 36 | C1-VISIT-068-COMP | A | companion | employer | /dashboard/employer/assessment-summary | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 438 |
| 37 | C1-VISIT-069 | A | primary | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 402 |
| 38 | C1-VISIT-069-COMP | A | companion | employer | /dashboard/employer/assessment-uploads | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 437 |
| 39 | C1-VISIT-070 | A | primary | employer | /dashboard/employer/calendar | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 415 |
| 40 | C1-VISIT-070-COMP | A | companion | employer | /dashboard/employer/calendar | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 448 |
| 41 | C1-VISIT-071 | A | primary | employer | /dashboard/employer/campus-guest-needs | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 397 |
| 42 | C1-VISIT-071-COMP | A | companion | employer | /dashboard/employer/campus-guest-needs | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 433 |
| 43 | C1-VISIT-072 | A | primary | employer | /dashboard/employer/discussions | completed | PASS | [nvidia] Target screen opens successfully | 381 |
| 44 | C1-VISIT-072-COMP | A | companion | employer | /dashboard/employer/discussions | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 419 |
| 45 | C1-VISIT-073 | A | primary | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target screen opens successfully | 389 |
| 46 | C1-VISIT-073-COMP | A | companion | employer | /dashboard/employer/drives | completed | PASS | [nvidia] Target screen opens successfully on desktop and mobile viewport | 430 |
| 47 | C1-VISIT-074 | A | primary | employer | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors or crash | 399 |
| 48 | C1-VISIT-074-COMP | A | companion | employer | /dashboard/employer/hiring-assessment | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors | 430 |
| 49 | C1-VISIT-075 | A | primary | employer | /dashboard/employer/internships | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 394 |
| 50 | C1-VISIT-075-COMP | A | companion | employer | /dashboard/employer/internships | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors or crashes. | 446 |
| 51 | C1-VISIT-076 | A | primary | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target screen opens successfully on /dashboard/employer/interviews | 398 |
| 52 | C1-VISIT-076-COMP | A | companion | employer | /dashboard/employer/interviews | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors or crashes | 431 |
| 53 | C1-VISIT-077 | A | primary | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 393 |
| 54 | C1-VISIT-077-COMP | A | companion | employer | /dashboard/employer/jobs | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 431 |
| 55 | C1-VISIT-078 | A | primary | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target screen opens successfully | 339 |
| 56 | C1-VISIT-078-COMP | A | companion | employer | /dashboard/employer/offers | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 423 |
| 57 | C1-VISIT-079 | A | primary | employer | /dashboard/employer/offers-upload | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 411 |
| 58 | C1-VISIT-079-COMP | A | companion | employer | /dashboard/employer/offers-upload | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 447 |
| 59 | C1-VISIT-080 | A | primary | employer | /dashboard/employer/overview | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 340 |
| 60 | C1-VISIT-080-COMP | A | companion | employer | /dashboard/employer/overview | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 440 |
| 61 | C1-VISIT-081 | A | primary | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 385 |
| 62 | C1-VISIT-081-COMP | A | companion | employer | /dashboard/employer/profile | completed | PASS | [nvidia] Target screen opens successfully on desktop and mobile viewports | 424 |
| 63 | C1-VISIT-082 | A | primary | employer | /dashboard/employer/projects | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 395 |
| 64 | C1-VISIT-082-COMP | A | companion | employer | /dashboard/employer/projects | completed | PASS | [nvidia] Target screen opens successfully with no runtime errors or crashes | 431 |
| 65 | C1-VISIT-083 | A | primary | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Target screen opens successfully | 407 |
| 66 | C1-VISIT-083-COMP | A | companion | employer | /dashboard/employer/select-campus | completed | PASS | [nvidia] Target screen opens successfully with no runtime error | 448 |
| 67 | C1-VISIT-084 | A | primary | employer | /dashboard/employer/sponsorships | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 391 |
| 68 | C1-VISIT-084-COMP | A | companion | employer | /dashboard/employer/sponsorships | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 426 |
| 69 | C1-VISIT-085 | A | primary | employer | /dashboard/feedback | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 388 |
| 70 | C1-VISIT-085-COMP | A | companion | employer | /dashboard/feedback | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 423 |
| 71 | C1-VISIT-086 | A | primary | employer | /dashboard/my-exports | completed | PASS | [nvidia] Target screen opens successfully | 388 |
| 72 | C1-VISIT-086-COMP | A | companion | employer | /dashboard/my-exports | completed | PASS | [nvidia] Target screen opens successfully without runtime error | 424 |
| 73 | C1-BLOCK-087 | A | primary | employer | /dashboard/admin/audit-reports | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 415 |
| 74 | C1-BLOCK-087-COMP | A | companion | employer | /dashboard/admin/audit-reports | completed | PASS | [nvidia] User was redirected to role-appropriate screen /dashboard/employer | 455 |
| 75 | C1-BLOCK-088 | A | primary | employer | /dashboard/admin/colleges | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 415 |
| 76 | C1-BLOCK-088-COMP | A | companion | employer | /dashboard/admin/colleges | completed | PASS | [nvidia] User redirected to employer role-appropriate screen | 450 |
| 77 | C1-BLOCK-089 | A | primary | employer | /dashboard/admin/employers | completed | PASS | [nvidia] Redirected to /dashboard/employer as expected | 413 |
| 78 | C1-BLOCK-089-COMP | A | companion | employer | /dashboard/admin/employers | completed | PASS | [nvidia] Employer user denied access to /dashboard/admin/employers | 454 |
| 79 | C1-BLOCK-090 | A | primary | employer | /dashboard/admin/feedback | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 413 |
| 80 | C1-BLOCK-090-COMP | A | companion | employer | /dashboard/admin/feedback | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 448 |
| 81 | C1-BLOCK-091 | A | primary | employer | /dashboard/admin/overview | completed | PASS | [nvidia] Redirected to employer dashboard | 408 |
| 82 | C1-BLOCK-091-COMP | A | companion | employer | /dashboard/admin/overview | completed | PASS | [nvidia] Access denied, correct role-appropriate screen displayed | 451 |
| 83 | C1-BLOCK-092 | A | primary | employer | /dashboard/admin/pending-registrations | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 416 |
| 84 | C1-BLOCK-092-COMP | A | companion | employer | /dashboard/admin/pending-registrations | completed | PASS | [nvidia] Employer denied access to /dashboard/admin/pending-registrations | 456 |
| 85 | C1-BLOCK-093 | A | primary | employer | /dashboard/admin/settings | completed | PASS | [nvidia] Redirected to employer dashboard | 407 |
| 86 | C1-BLOCK-093-COMP | A | companion | employer | /dashboard/admin/settings | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 449 |
| 87 | C1-BLOCK-094 | A | primary | employer | /dashboard/admin/users | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 412 |
| 88 | C1-BLOCK-094-COMP | A | companion | employer | /dashboard/admin/users | completed | PASS | [nvidia] Employer denied access to /dashboard/admin/users | 446 |
| 89 | C1-BLOCK-095 | A | primary | employer | /dashboard/college/applications | completed | PASS | [nvidia] Employer redirected from /dashboard/college/applications as expected | 416 |
| 90 | C1-BLOCK-095-COMP | A | companion | employer | /dashboard/college/applications | completed | PASS | [nvidia] User redirected to employer role-appropriate screen | 450 |
| 91 | C1-BLOCK-096 | A | primary | employer | /dashboard/college/audit-reports | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 416 |
| 92 | C1-BLOCK-096-COMP | A | companion | employer | /dashboard/college/audit-reports | completed | PASS | [nvidia] Employer denied access to /dashboard/college/audit-reports | 456 |
| 93 | C1-BLOCK-097 | A | primary | employer | /dashboard/college/calendar | completed | PASS | [nvidia] Employer denied access to /dashboard/college/calendar | 413 |
| 94 | C1-BLOCK-097-COMP | A | companion | employer | /dashboard/college/calendar | completed | PASS | [nvidia] Employer denied access to /dashboard/college/calendar | 451 |
| 95 | C1-BLOCK-098 | A | primary | employer | /dashboard/college/clarifications | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 415 |
| 96 | C1-BLOCK-098-COMP | A | companion | employer | /dashboard/college/clarifications | completed | PASS | [nvidia] Employer denied access to /dashboard/college/clarifications | 452 |
| 97 | C1-BLOCK-099 | A | primary | employer | /dashboard/college/discussions | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 414 |
| 98 | C1-BLOCK-099-COMP | A | companion | employer | /dashboard/college/discussions | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 453 |
| 99 | C1-BLOCK-100 | A | primary | employer | /dashboard/college/drives | completed | PASS | [nvidia] Employer redirected to /dashboard/employer as expected | 414 |
| 100 | C1-BLOCK-100-COMP | A | companion | employer | /dashboard/college/drives | completed | PASS | [nvidia] Employer user denied access to /dashboard/college/drives | 453 |