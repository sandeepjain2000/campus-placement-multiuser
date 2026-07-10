/**
 * In-app Developer page — QA runbook (Guided Runner + demo tools).
 * Route: /developer — keep in sync with qa/docs/guided-runner-quickstart.md
 */

import {
  enrichUseCaseFlow,
  groupUseCasesByRole,
  useCaseAutoRunnerCommand,
  useCaseApiRunnerCommand,
  USE_CASE_ROLE_LABELS,
} from '@/content/useCaseCatalog';

export { USE_CASE_ROLE_LABELS, useCaseAutoRunnerCommand, useCaseApiRunnerCommand };

export const DEVELOPER_PAGE_META = {
  title: 'Developer Notes',
  notesTitle: 'Guided Runner · Demo APIs · Cleanup',
  subtitle: 'Guided Runner, partial automated testing, demo APIs, and cleanup — for when you return after a break.',
  repoPath: 'campus-placement',
  terminalHelp: 'npm run test:guided:help',
};

/** Table of contents for /developer — keep in sync with DeveloperPage section ids. */
export const DEVELOPER_PAGE_TOC = [
  { id: 'quick-start', label: 'Quick start', hint: 'npm run dev + guided help' },
  { id: 'playbooks', label: 'Guided playbooks', hint: 'Partial E2E flows by scenario' },
  { id: 'use-cases', label: 'Use cases', hint: '5 flows + voice runner per row' },
  { id: 'use-cases-more', label: 'More use cases', hint: '10 additional flows', href: '/developer/use-cases-more' },
  { id: 'use-cases-user-testing', label: 'User testing', hint: 'Email, admin, platform QA', href: '/developer/use-cases-user-testing' },
  { id: 'use-cases-by-role', label: 'Use cases by role', hint: 'All flows per actor', href: '/developer/use-cases-by-role' },
  { id: 'runner-alerts', label: 'Runner alerts', hint: 'Recent UI / menu changes' },
  { id: 'pending', label: 'Pending backlog', hint: 'Bugs, features, wish list' },
  { id: 'production-hardening', label: 'Production hardening', hint: 'Pre-launch security & QA' },
  { id: 'email-demo', label: 'Email & demo mail', hint: 'YOPmail, workflows preview' },
  { id: 'e2e-roles', label: 'Internship E2E roles', hint: 'Who does what in full cycle' },
  { id: 'panel', label: 'Next button', hint: 'How the screen tag works' },
  { id: 'screen-tag', label: 'Screen tag states', hint: 'Armed, idle, running' },
  { id: 'marker', label: 'Session marker', hint: 'GT- titles link publish → apply' },
  { id: 'logins', label: 'Demo logins', hint: 'Employer, college, student' },
  { id: 'demo-apis', label: 'Demo APIs & cleanup', hint: 'Seed data, purge, tie-ups' },
  { id: 'cleanup', label: 'Clean up & restore', hint: 'Full wipe + restore tie-ups' },
  { id: 'legacy', label: 'Legacy commands', hint: 'Sync routes, focus areas' },
  { id: 'database-schema', label: 'Database schema', hint: 'Tables, FKs, domain map', href: '/developer/database-schema' },
  { id: 'form-field-registry', label: 'Form field registry', hint: 'Fields + [VAL-…] error codes', href: '/developer/form-field-registry' },
  { id: 'related', label: 'Related files', hint: 'Markdown & SQL in repo' },
];

/** @deprecated use DEVELOPER_PAGE_META */
export const DEVELOPER_NOTES_META = DEVELOPER_PAGE_META;

export const QUICK_START_STEPS = [
  { step: '0', command: 'npm run dev', detail: 'Start the app (terminal 1 — leave running)' },
  { step: '1', command: 'npm run test:guided:help', detail: 'Print cheat sheet in terminal 2' },
  { step: '2', command: '(pick a playbook below)', detail: 'Run in terminal 2 from the app folder' },
];

export const GUIDED_PLAYBOOKS = [
  {
    goal: 'Internship guides, supervisors & feedback — auto + voice (after Select)',
    command: 'qa/runners/batch/run_internship_care_auto_voice.bat',
    focus: 'npm run test:guided:voice-internship-care · Requires selected intern · pip install -r qa/data/requirements/requirements-voice.txt once',
  },
  {
    goal: 'Full internship E2E — auto + voice for OBS recording (no blue-tag clicks)',
    command: 'qa/runners/batch/run_internship_e2e_auto_voice.bat',
    focus: 'npm run test:guided:playbook-e2e-auto-voice · pip install -r qa/data/requirements/requirements-voice.txt once',
  },
  {
    goal: 'Employer publish + college approve — auto + voice',
    command: 'qa/runners/batch/run_internship_publish_auto_voice.bat',
    focus: 'npm run test:guided:playbook-auto',
  },
  {
    goal: 'Student apply + employer select — auto + voice',
    command: 'qa/runners/batch/run_internship_apply_auto_voice.bat',
    focus: 'npm run test:guided:playbook-apply-auto',
  },
  {
    goal: 'Full placement drive cycle — Employer → College → Student → Employer',
    command: 'npm run test:guided:playbook-drives-e2e',
    focus: 'DRV-E04/05, DRV-C03, DRV-S04, DRV-E12/13, DRV-S10',
  },
  {
    goal: 'Employer requests placement drive + college approves',
    command: 'npm run test:guided:playbook-drives',
    focus: 'DRV-E04, DRV-E05, DRV-C03',
  },
  {
    goal: 'Student apply + employer select (after drive request)',
    command: 'npm run test:guided:playbook-drives-apply',
    focus: 'DRV-C03, DRV-S04, DRV-E12, DRV-E13, DRV-S10',
  },
  {
    goal: 'Browse Focus Areas drive cases (navigation only — no CSV)',
    command: 'npm run test:guided:drives',
    focus: 'placement-drives section',
  },
  {
    goal: 'Full internship cycle — Employer → College → Student → Employer (recommended)',
    command: 'npm run test:guided:playbook-e2e',
    focus: 'EI-02/03, CI-01, SI-04, EI-15/16, SI-09',
  },
  {
    goal: 'Employer publishes internship only (form fill + publish)',
    command: 'npm run test:guided:playbook',
    focus: 'EI-02, EI-03',
  },
  {
    goal: 'College → student apply → employer select (after publish)',
    command: 'npm run test:guided:playbook-apply',
    focus: 'CI-01, SI-04, EI-15, EI-16, SI-09',
  },
  {
    goal: 'Split E2E (two terminals / two sessions)',
    command: 'npm run test:guided:playbook then test:guided:playbook-apply',
    focus: 'Uses SQLite marker between runs',
  },
  {
    goal: 'List all playbooks',
    command: 'npm run test:guided:playbook-list',
    focus: '—',
  },
  {
    goal: 'Fix empty approved campuses (IIT Madras for all employers)',
    command: 'npm run qa:ensure-partnership',
    focus: 'SETUP',
  },
  {
    goal: 'Fix TechCorp approved campuses (hr@techcorp.com × all active colleges)',
    command: 'npm run qa:ensure-techcorp-partnerships',
    focus: 'SETUP — before internship apply/select playbook',
  },
  {
    goal: 'Restore all demo tie-ups (IITM + NITT + BITS × 5 demo employers)',
    command: 'Developer Notes → Demo APIs → Campus tie-ups → Restore all demo tie-ups',
    focus: 'SETUP after cleanup',
  },
  {
    goal: 'Legacy: IIT Madras tie-up only (demo employers)',
    command: 'Open /data-entry → Campus tie-ups → Ensure IIT Madras tie-up',
    focus: 'SETUP',
  },
];

/** npm / bat command for auto + voice guided tour by use-case slug */
export function useCaseRunnerCommand(slug) {
  return `npm run test:guided:voice -- ${slug}`;
}

export function useCaseRunnerBat(slug) {
  return `qa/runners/batch/run_use_case_auto_voice.bat ${slug}`;
}

/** End-to-end use cases — one row each, up to 7 steps (columns). */
export const USE_CASE_FLOWS = [
  {
    name: 'Placement drive (full cycle)',
    runnerSlug: 'placement-drive-full',
    steps: [
      'Employer: request campus tie-up (Campus Partnerships)',
      'College: approve employer partnership',
      'Employer: submit placement drive for campus',
      'College: approve drive (Awaiting Approval → Approved)',
      'Student: apply from Placement Drives',
      'Employer: shortlist / select on Applications → Drives',
      'Student: track outcome in My Applications',
    ],
  },
  {
    name: 'Internship publish → hire',
    runnerSlug: 'internship-publish-hire',
    steps: [
      'Employer: publish internship with GT- marker title',
      'College: approve listing on Internships & Programs',
      'Student: browse internships and apply',
      'Employer: review Applications → Internships',
      'Employer: mark applicant Shortlist or Select',
      'Student: confirm Selected status in My Applications',
      'Employer: optional Submit results after Assessment Update',
    ],
  },
  {
    name: 'Student verified → first application',
    runnerSlug: 'student-verified-first-app',
    steps: [
      'College: add student to master list (email + roll on record)',
      'Student: log in with email + temp password from welcome mail',
      'Student: change password after first login',
      'Student: complete profile and upload resume',
      'College: verify student (Students screen)',
      'Student: browse eligible drives/internships and apply',
      'Student: check Alerts; respond in My Offers if selected',
    ],
  },
  {
    name: 'Assessment results (CSV)',
    runnerSlug: 'assessment-csv',
    steps: [
      'Employer: select campus + drive or job on Assessment uploads',
      'Employer: export CSV template (eligible students pre-filled)',
      'Employer: fill hiring_result column and upload CSV',
      'Employer: fix rejected rows via correction screen if needed',
      'Employer: Submit results (locks further edits)',
      'Employer: review Hiring Results Dashboard',
      'College: read-only view on Hiring Assessment',
    ],
  },
  {
    name: 'Campus partnership → visible posting',
    runnerSlug: 'campus-partnership-posting',
    steps: [
      'Employer: complete Company Profile',
      'Employer: request tie-up with target college',
      'College: approve partnership',
      'Employer: set Active campus in header',
      'Employer: create job, internship, or drive for that campus',
      'College: approve job/internship visibility if required',
      'Student: sees posting after tie-up + approval + eligibility',
    ],
  },
];

/** Additional use cases — shown on /developer/use-cases-more */
export const USE_CASE_FLOWS_MORE = [
  {
    name: 'Offer → accept → placement lock',
    runnerSlug: 'offer-accept-lock',
    steps: [
      'Employer: record offer from Applications or Offers page',
      'Student: open My Offers and review terms',
      'Student: accept or decline before deadline',
      'College: monitor Offers and placement rules (max offers)',
      'Student: placement lock blocks new drive/program applies',
      'College: Reports reflect accepted offer',
      'Employer: sees accepted status on pipeline views',
    ],
  },
  {
    name: 'Assessment Update Online',
    runnerSlug: 'assessment-update-online',
    steps: [
      'Employer: select campus + drive or job tab',
      'Employer: open Assessment Update Online',
      'Employer: edit hiring_result inline per student row',
      'Employer: Save changes (dirty row count)',
      'Employer: Submit results when complete',
      'Employer: verify Hiring Results Dashboard',
      'College: read-only Hiring Assessment mirror',
    ],
  },
  {
    name: 'Clarifications (official Q&A)',
    runnerSlug: 'clarifications',
    steps: [
      'College: create Clarifications batch for a company',
      'College: publish questions from students or TPO',
      'Employer: view batch (via college process / discussions)',
      'College: post official answers in batch',
      'Student: read answered clarifications before applying',
      'Student: uses Discussions only where college enables',
      '—',
    ],
  },
  {
    name: 'Interview scheduling',
    runnerSlug: 'interview-scheduling',
    steps: [
      'Employer / college: define drive or program interview rounds',
      'College: coordinate slots on Calendar / Interview Scheduling',
      'Student: receives Alert for scheduled slot',
      'Student: opens My Interviews for date, venue, mode',
      'Employer: updates application status after round',
      'Employer: records assessment round results if applicable',
      'Student: tracks progress in My Applications',
    ],
  },
  {
    name: 'Full-time job (no placement drive)',
    runnerSlug: 'full-time-job',
    steps: [
      'Employer: publish full_time job with campus visibility',
      'College: approve job on Internships & Programs / Jobs list',
      'Student: browse Jobs and check eligibility',
      'Student: apply via program application path',
      'Employer: review Applications → Jobs',
      'Employer: update status or record offer',
      'Student: offer flow same as drive-selected candidate',
    ],
  },
  {
    name: 'New employer registration → approval',
    runnerSlug: 'employer-registration',
    steps: [
      'Employer: register on Sign In → Create account (company + admin details)',
      'Employer: open Verify your email link (context: email_verification in logs)',
      'Super admin: Pending Registrations → review and Approve',
      'Employer: receives approval mail (context: registration_approved)',
      'Employer: sign in with chosen password',
      'Employer: complete Company Profile and request campus tie-up',
      'Super admin: Email delivery logs — search employer login email',
    ],
  },
  {
    name: 'Password reset',
    runnerSlug: 'password-reset',
    steps: [
      'User: Sign In → Forgot password → enter login email',
      'User: open reset link from inbox (context: password_reset; 1-hour expiry)',
      'User: choose new password on Reset Password screen',
      'User: sign in with new password',
      'Super admin: Email logs — confirm recipient_login_email matches account',
      'Repeat with wrong email — same success message (no enumeration)',
      '—',
    ],
  },
  {
    name: 'Bulk student import (CSV)',
    runnerSlug: 'bulk-student-import',
    steps: [
      'College: Students → Bulk upload — valid CSV (email, roll, name)',
      'System: welcome email to each login address (context: student_welcome)',
      'College: receives import summary mail (context: college_student_bulk_import)',
      'Student: sign in with temp password from welcome mail',
      'Student: optional password change; complete profile + resume',
      'College: verify student on Students list',
      'Student: apply to eligible internship or drive',
    ],
  },
  {
    name: 'Sponsorship donation receipt',
    runnerSlug: 'sponsorship-receipt',
    steps: [
      'College: Sponsorships → record donation (sponsor name + email)',
      'College: Send receipt — enter or confirm sponsor email',
      'Sponsor inbox: receipt mail (context: sponsorship_donation_receipt)',
      'Super admin: Email logs — search sponsor email or context',
      'College: thank-you auto-mail may follow (context: sponsorship_college_thanks_sponsor)',
      'College: Reports reflect sponsorship totals',
      '—',
    ],
  },
  {
    name: 'Employer interview slot notify',
    runnerSlug: 'interview-slot-notify',
    steps: [
      'Employer: Campus Partnerships approved for target college',
      'Employer: Interview Scheduling — link slot to job/internship/drive',
      'Employer: Notify applicants — picks eligible students with email',
      'Students: receive slot mail (context: employer_interview_slot)',
      'Student: My Interviews shows date, mode, venue',
      'Employer: update application status after the round',
      'Super admin: Email logs — filter by context employer_interview_slot',
    ],
  },
];

export const USE_CASES_MORE_NOTES = {
  href: '/developer/use-cases-more',
  label: 'More use cases (10 additional flows)',
};

/** Platform, email, and admin QA flows — /developer/use-cases-user-testing */
export const USE_CASE_FLOWS_USER_TESTING = [
  {
    name: 'Email delivery audit (super admin)',
    runnerSlug: 'email-delivery-audit',
    steps: [
      'Trigger outbound mail (e.g. employer Select → student_selection context)',
      'Super admin: Platform → Email delivery logs',
      'Search recipient login email (survives deleted QA accounts)',
      'Row shows Context, Recipient (login), Original → Final',
      'Open detail: Original, After communication routing, Final SMTP',
      'Confirm recipient_login_email, role, name when user still exists',
      'Copy raw log JSON for ticket / regression notes',
    ],
  },
  {
    name: 'Communication email routing',
    runnerSlug: 'communication-email-routing',
    steps: [
      'Super admin or DB: set user communication_email ≠ login email',
      'Trigger mail to login address (selection, welcome, reset, etc.)',
      'Email logs: original_to = login; after_communication_to = communication inbox',
      'Final resolved_to follows platform override (YOPmail / OUTBOUND_EMAIL_OVERRIDE)',
      'Student still signs in with login email only',
      'Verify in logs: recipient_login_email always stores login address',
      '—',
    ],
  },
  {
    name: 'Session ads banner toggle',
    runnerSlug: 'session-ads-toggle',
    steps: [
      'Super admin: Platform Settings → Show sponsored banner (default off)',
      'Student or employer: refresh dashboard — no SessionAdBanner',
      'Super admin: enable checkbox → Save',
      'Any role: refresh — sponsored banner visible on dashboard',
      'Super admin: disable again — banner disappears after refresh',
      'No mail sent — UI-only regression',
      '—',
    ],
  },
  {
    name: 'Audit report export email',
    runnerSlug: 'audit-report-export',
    steps: [
      'College admin or super admin: Audit Reports',
      'Pick date range + scope (campus or platform-wide)',
      'Enter delivery email → Export',
      'Inbox: download link mail (context: audit_report_export)',
      'Open time-limited link — CSV downloads',
      'Email logs: confirm context + requested email as recipient',
      '—',
    ],
  },
  {
    name: 'Login support & feedback reply',
    runnerSlug: 'login-support-feedback',
    steps: [
      'User: Login page → Need help signing in → submit message',
      'Platform inbox: mail with context login_support (replyTo = user email)',
      'User: Feedback → submit thread as student/employer/college',
      'Super admin: reply on Feedback admin screen',
      'User: in-app Alert + email (context: feedback_reply)',
      'Email logs: search submitter login email',
      '—',
    ],
  },
  {
    name: 'Personal data export notice',
    runnerSlug: 'data-export-notice',
    steps: [
      'Any role: Profile or Privacy → Export my data',
      'Browser downloads CSV attachment',
      'Communication inbox: notice mail (context: user_data_export)',
      'Email logs: acting user = recipient; recipientUserId set',
      'Re-run export — new log row with fresh timestamp',
      'Super admin: confirm no password or token in mail body',
      '—',
    ],
  },
  {
    name: 'Internship guides, supervisors & feedback',
    runnerSlug: 'internship-guides-feedback-supervisors',
    steps: [
      'Prerequisite: intern in Selected or In progress (apply-select playbook if empty)',
      'College: assign campus guide on Internship guides',
      'Employer: assign company supervisor on Internship supervisors',
      'Employer: submit progress review on Internship Progress Reviews',
      'Student: view guide + supervisor; submit feedback',
      'College: read-only Internship Progress Reviews table + CSV export',
      'College: verify supervisor on Internship guides card',
    ],
  },
  {
    name: 'Guest engagement confirmation',
    runnerSlug: 'guest-engagement',
    steps: [
      'Employer: Engagement listings → open listing with guest registrants',
      'Send confirmation to guest email on a row',
      'Guest inbox: confirmation mail (context: guest_confirmation)',
      'Employer: resend blocked or idempotent per product rules',
      'Email logs: original guest address + employer as acting user',
      'College: read-only view if listing is campus-scoped',
      '—',
    ],
  },
  {
    name: 'College internship approve (list view)',
    runnerSlug: 'college-internship-approve',
    steps: [
      'Employer: publish internship with GT- marker (see guided playbook)',
      'College: Internships & Programs — default Card view shows title',
      'College: switch to List view — Title column must not be blank',
      'College: Approve for campus (green check icon on row)',
      'Student: internship visible after approval',
      'Guided runner: qa/runners/batch/run_internship_publish_auto_voice.bat for OBS demo',
      'Email logs if selection follows: student_selection context',
    ],
  },
  {
    name: 'College offers upload and student visibility',
    runnerSlug: 'college-offers-upload',
    steps: [
      'College: Offers → Upload — download CSV template',
      'College: fill student roll, company, salary, deadline columns',
      'College: upload CSV and fix any row-level validation errors',
      'System: matching students receive offer rows',
      'Student: My Offers shows uploaded offer',
      'Student: accept or decline before deadline',
      'College: Reports reflect accepted offers',
    ],
  },
  {
    name: 'Super admin governance and audit visibility',
    runnerSlug: 'admin-governance',
    steps: [
      'Super admin: Platform overview — colleges and employers',
      'Super admin: Pending registrations queue',
      'Super admin: Error logs (S-111) with reference codes',
      'Super admin: Email delivery logs',
      'Super admin: Audit reports export',
      'Super admin: Platform settings',
      '—',
    ],
  },
];

export const USE_CASES_USER_TESTING_NOTES = {
  href: '/developer/use-cases-user-testing',
  label: 'User testing use cases (email, admin, platform)',
};

/** All happy-path use cases (no edge cases), enriched with roles and UC ids. */
export const ALL_USE_CASES = [
  ...USE_CASE_FLOWS,
  ...USE_CASE_FLOWS_MORE,
  ...USE_CASE_FLOWS_USER_TESTING,
].map(enrichUseCaseFlow);

/** Use cases grouped by actor role. */
export const USE_CASE_CATALOG_BY_ROLE = groupUseCasesByRole(ALL_USE_CASES);

export const USE_CASES_BY_ROLE_NOTES = {
  href: '/developer/use-cases-by-role',
  label: `All use cases by role (${ALL_USE_CASES.length} flows)`,
};

/** Validation error code prefix — separate from platform API [Ref: …] codes. */
export const VALIDATION_ERROR_CODES_NOTES = {
  format: '[VAL-{FIELD}-{RULE}] Human-readable message',
  example: '[VAL-STU-CGPA-RNG] CGPA must be greater than 0 and at most 10.',
  libs: ['src/lib/validationErrorCode.js', 'src/lib/inputConstraints.js', 'src/lib/validators.js'],
  apiErrors: 'HTTP/API failures use [Ref: XXXXXXXX] from platform_error_logs — not VAL codes.',
  listCommand: 'npm run qa:uc:list',
};

/** Old login has Demo accounts picker; production-style login is /sign-in */
export const LOGIN_PAGE_LINKS = {
  oldWithDemoAccounts: '/login',
  newSignIn: '/sign-in',
};

export const RUNNER_PANEL_STEPS = [
  'One browser window — step instructions print in the terminal running npm run test:guided:playbook-e2e.',
  'One blue screen-tag click per step when it pulses (Alt+Enter works). Read Observe in the terminal, then click.',
  'While automation runs, the tag fades and is not clickable — wait for the next pulse.',
  'See Screen tag states below for armed / idle / running.',
  'Landing banner: Developer Notes link beside the YOPmail line.',
  'Disable globally: NEXT_PUBLIC_HIDE_GUIDED_RUNNER=true.',
];

/** Screen tag (S-xx / LANDING / LOGIN) — top-right during guided tests. */
export const SCREEN_TAG_STATES = [
  {
    look: 'Blue + yellow border + pulse',
    state: 'Armed',
    meaning: 'Click it (or press Alt+Enter) to run this step. Read Observe in the terminal first.',
    previewClass: 'dev-notes-tag-preview--armed',
  },
  {
    look: 'Red/pink, no pulse',
    state: 'Idle',
    meaning: 'Playbook is running, but this step is not waiting for you yet — check the terminal.',
    previewClass: 'dev-notes-tag-preview--idle',
  },
  {
    look: 'Blue, faded / not clickable',
    state: 'Running',
    meaning: 'Automation is in progress — wait until it finishes.',
    previewClass: 'dev-notes-tag-preview--running',
  },
];

export const SCREEN_TAG_ARMED_CLICKS = [
  'One armed click runs the step (login, navigate, fill, publish, etc.) and advances to the next step automatically.',
  'Read Observe in the terminal before each click — you control pace by waiting for the pulse.',
];

export const SCREEN_TAG_STUCK_TIPS = [
  'One click, then wait — if the tag turns green, the click worked; wait for automation or the next armed pulse.',
  'Alt+Enter — same as clicking the tag when it is armed.',
  'If it shakes — the step is not ready yet; check the playbook terminal for the current step.',
];

export const SESSION_MARKER_NOTES = [
  'Full-cycle playbook (npm run test:guided:playbook-e2e) runs all roles in one session — includes guide, supervisor, and feedback after Select.',
  'Post-Select only (voice): qa/runners/batch/run_internship_care_auto_voice.bat or npm run test:guided:voice-internship-care.',
  'Placement drive playbooks: test:guided:playbook-drives-e2e (full), playbook-drives (request + approve), playbook-drives-apply (apply + select). CSV export/upload on drives is still manual — see qa/docs/manual-test-playbook.md.',
  'Publish-only or apply-only playbooks still available for partial testing.',
  'Publish playbook creates a title like GT-20260529T1530 Summer Data Intern.',
  'Marker + every step event are stored in db/sqlite/guided_testing.sqlite (laptop only).',
  'View log: npm run qa:guided:db-log',
  'Apply playbook reads guided_session.marker to find the same internship.',
  'Override (PowerShell): $env:PH_GUIDED_MARKER="GT-..."; npm run test:guided:playbook-apply',
];

export const INTERNSHIP_E2E_ROLES = [
  { role: 'Employer', steps: 'Partnership (if needed), publish internship with GT- marker (start 1 Jul 2026, end 31 Dec 2026)', account: 'hr@techcorp.com' },
  { role: 'College', steps: 'Approve tie-up (if needed), Approve for campus on Internships list (green check icon)', account: 'admin@iitm.edu' },
  { role: 'Student', steps: 'Browse internships, apply to GT- posting', account: 'arjun.verma@iitm.edu' },
  { role: 'Employer', steps: 'Shortlist and Select applicant on Applications → Internships', account: 'hr@techcorp.com' },
  { role: 'College', steps: 'Assign campus guide (Internship guides)', account: 'admin@iitm.edu' },
  { role: 'Employer', steps: 'Assign supervisor (Internship supervisors) and submit feedback', account: 'hr@techcorp.com' },
  { role: 'Student', steps: 'View guide + supervisor; submit Internship Progress Reviews', account: 'arjun.verma@iitm.edu' },
  { role: 'Closure', steps: 'College reads feedback; student confirms Selected on My Applications', account: 'admin@iitm.edu / arjun.verma@iitm.edu' },
];

export const DEMO_LOGINS = [
  { role: 'Employer', email: 'hr@techcorp.com' },
  { role: 'College admin', email: 'admin@iitm.edu' },
  { role: 'Student', email: 'arjun.verma@iitm.edu' },
];

export const DEMO_PASSWORD = 'Admin@123';

/** Shown on /developer and in npm run test:guided:help — keep current after UI/menu changes. */
export const RUNNER_CHANGE_ALERTS = [
  {
    date: '2026-06-02',
    title: 'Internship guides, supervisors & feedback — voice runners',
    items: [
      'New screens: college Internship guides / progress reviews; employer Internship supervisors / progress reviews; student Internship Progress Reviews.',
      'Standalone voice tour: qa/runners/batch/run_internship_care_auto_voice.bat (or npm run test:guided:voice-internship-care).',
      'Slug: internship-guides-feedback-supervisors · Prerequisite: selected intern — run apply-select bat first if lists are empty.',
      'Full E2E + apply-select playbooks now include post-Select steps (guide, supervisor, feedback) when using auto + voice.',
      'Migrations: npm run db:migrate:090 db:migrate:091 db:migrate:092 before testing.',
    ],
  },
  {
    date: '2026-06-16',
    title: 'Use-case voice runners (all 24 flows)',
    items: [
      'Every Developer Notes use case has an auto + voice runner: npm run test:guided:voice -- <slug>',
      'Windows: qa/runners/batch/run_use_case_auto_voice.bat <slug> · List slugs: npm run test:guided:voice-list',
      'Full E2E (internship, placement drive) reuse existing playbooks; others are navigation tours with manual pauses.',
      'Regenerate tour JSON: npm run test:guided:build-uc-playbooks after editing qa/guided/config/use-case-tours.json',
      'Legacy internship bats still work: qa/runners/batch/run_internship_e2e_auto_voice.bat = slug internship-publish-hire',
    ],
  },
  {
    date: '2026-06-16',
    title: 'Internship guided runner — college approve + dates + email audit',
    items: [
      'College Internships defaults to card view — runner now switches to List view and clicks Approve for campus (icon button).',
      'Playbook internship dates: start 1 Jul 2026, end 31 Dec 2026.',
      'OBS screen recordings: qa/runners/batch/run_internship_e2e_auto_voice.bat (or npm run test:guided:playbook-e2e-auto-voice).',
      'Dashboard ads: Super Admin → Platform Settings → Show sponsored banner (off by default).',
      'Email delivery logs: recipient_login_email, context on all sends, three-step routing trail — Developer Notes → User testing use cases.',
    ],
  },
  {
    date: '2026-06-09',
    title: 'Cleanup & demo sandbox',
    items: [
      'Full reset: npm run db:clear-placement — removes all jobs, internships, drives (hard delete + cascades). Documented on /developer#cleanup.',
      'After wipe: Developer Notes → Demo APIs → Restore all demo tie-ups (IITM / NITT / BITS × 5 employers).',
      'Demo APIs and selective purge live on /developer#demo-apis (no separate landing panel).',
      'Test colleges: py -3 scripts/delete_test_college_tenants.py — keeps only seed campuses.',
      'Test employers: py -3 scripts/delete_test_employers.py — keeps 5 demo logins (TechCorp, GlobalSoft, Infosys, Innovent Labs, FinEdge); removes QA companies and cascades jobs, drives, CSV assessment uploads.',
      'Employer tie-up Revoke button disabled (visible but not clickable).',
    ],
  },
  {
    date: '2026-05-29',
    title: 'Recruitment & assessment UI',
    items: [
      'Placement drive playbooks: npm run test:guided:playbook-drives-e2e (full cycle), playbook-drives (request + approve), playbook-drives-apply (apply + select). CSV on drives is still manual.',
      'Assessment uploads (CSV) — tabs Internship / Jobs / Drive / Projects; Export CSV per tab (all applications, same columns as import); CSV upload only (no mapping dialog); round display names from Assessment map.',
      'Assessment Update Online — new screen below CSV uploads; tabbed application table with inline round edits.',
      'Hiring Results Dashboard — read-only employer view (was Hiring Assessment); tabbed by opportunity type.',
      'Assessment map — configure round labels per kind under Settings (used by CSV upload and online update).',
      'Offer CSV import removed — employers use Offer templates + bulk generate; colleges use manual Add offer. Legacy /offers-upload URLs redirect to Offers.',
      'Purge test data — removed from employer/college login menus; super-admin only on /data-entry.',
      'After dashboardMenu.js edits run: npm run qa:sync-routes',
    ],
  },
];

/**
 * Pre-launch security, RBAC QA, and defense-in-depth — not blocking sandbox workflow.
 * category: security | rbac | ops
 */
export const DEVELOPER_PRODUCTION_HARDENING = {
  intro:
    'Items to verify or ship before production. Campus switching is disabled in the UI; these are API/storage edge cases and pen-test follow-ups — not day-to-day sandbox blockers.',
  items: [
    {
      id: 'employer-change-campus-rbac',
      category: 'rbac',
      title: 'Employer campus scope — manual QA + optional API hardening',
      detail:
        'Campus switcher disabled (“All campuses” top bar; Use campus buttons off). Server writes check employer_approvals. Before launch: script QA — forge campusId in storage/API for an unapproved tenant → expect 403 or empty, never another employer’s rows. Optional: assertEmployerApprovedCampus on GET /api/employer/interviews; re-validate activeCampus client-side on overview.',
      source: 'Exploration F29',
    },
  ],
};

/**
 * Backlog from exploration review + product deferrals — not scheduled for immediate work.
 * category: bug | feature | wishlist | security | ux | cleanup
 */
export const DEVELOPER_PENDING_BACKLOG = {
  intro:
    'Tracked items from sandbox QA / exploration (Jun 2026). Implemented or dismissed items are omitted. Use this as the feature wish list, bug list, and “handle later” queue.',
  items: [
    {
      id: 'employer-dashboard-weekly-applications',
      category: 'feature',
      title: 'Employer overview — real weekly applications delta + full applicant totals',
      detail:
        'Wire a real “this week” count (or remove badge permanently). Include program_applications (internships, jobs, projects) in Total Applications, not only placement drive applications. API: /api/employer/dashboard.',
      source: 'Exploration F24',
      decision: 'We can handle it later. I don\'t want to do it right now.',
    },
    {
      id: 'employer-offers-acceptance-rate-na',
      category: 'bug',
      title: 'Employer overview — show N/A when zero offers extended',
      detail:
        'Fixed Jun 2026: badge shows “No offers yet” when offersExtended is 0; % only when offers exist.',
      source: 'Exploration F25',
      decision: 'Done',
    },
    {
      id: 'ai-title-validation',
      category: 'feature',
      title: 'AI validation for meaningful job / company / listing names',
      detail:
        'Replace or augment min-length title rules so garbage like “ABCD” or “DATA” is rejected. Programmatic charset rules alone are insufficient for sandbox data quality.',
      source: 'Exploration F15, F19',
      decision: 'Deferred — AI validation later, not programmatic-only.',
    },
    {
      id: 'college-approve-notification-titles',
      category: 'ux',
      title: 'Sanitize “New internship” notification titles on college approve',
      detail:
        'jobPostingCollegeApproval.js still interpolates raw posting title. Add fallback copy or validation when title is weak (legacy seed data).',
      source: 'Exploration F19',
    },
    {
      id: 'remove-data-entry-hub',
      category: 'cleanup',
      title: 'Remove /data-entry hub entirely',
      detail:
        'Developer Notes + demo APIs are sufficient. /data-entry is password-gated (same as /developer) but could be deleted once purge/seed flows live only under /developer.',
      source: 'Exploration F22 · product decision Jun 2026',
    },
    {
      id: 'hide-dev-screen-ids-production',
      category: 'cleanup',
      title: 'Hide S-xx screen ID pills in production',
      detail: 'Set NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS=false at launch. Intentional for pre-launch QA on all roles.',
      source: 'Exploration F8, F26',
    },
    {
      id: 'branch-eligibility-taxonomy',
      category: 'feature',
      title: 'Cross-college branch taxonomy before per-college eligibility rules',
      detail:
        'Branch matching is off (BRANCH_ELIGIBILITY_MATCHING_ENABLED=false). Remove or hide misleading “All eligible branches” UI when a common denominator taxonomy exists.',
      source: 'Exploration F14',
    },
    {
      id: 'tpo-shadow-employer-accounts',
      category: 'feature',
      title: 'Shadow Employer accounts — TPO-operated drives & employer workflow',
      detail:
        'Workflow validation #5 (TPO drive creation): instead of a separate “college creates drive” screen, provision Shadow Employer login(s) per campus that the TPO operates. TPO uses the normal employer path — drive request, assessments, bulk offers, templates — on behalf of off-platform or campus-initiated recruiters without waiting for a real employer account. Needs RBAC (TPO-only, scoped to tenant), audit trail, and clear UI that the session is shadow/proxy. Replaces building duplicate college-side drive authoring.',
      source: 'Workflow validation #5 · product direction Jun 2026',
      decision: 'Pending — shadow employer model preferred over native TPO drive creation UI.',
    },
    {
      id: 'placement-analytics-reporting',
      category: 'feature',
      title: 'Placement Analytics & Reporting — employer and college roles',
      detail:
        'Workflow validation #8. College (partial today): /dashboard/college/reports — dept placement %, salary bands, top recruiters, YoY, student–company events, CSV exports; audit reports separate. Gaps: academic-year scoping consistency, internship/program offers in same season view, live season dashboard. Employer (missing today): no dedicated analytics menu — only overview stat tiles (F24 incomplete), Hiring Results Dashboard (assessment grid), and ad-hoc CSV exports on assessments/applications/offers. Target: unified “Placement analytics” for both roles — funnel (applied → shortlisted → selected → offer → accepted), CTC distribution, time-to-hire, per-campus breakdown for multi-campus employers, per-drive/per-program filters, export parity. College = institute season + department; Employer = own pipelines across drives, internships, jobs, projects.',
      source: 'Workflow validation #8 · product request Jun 2026',
      decision: 'Pending — name and scope agreed; build after core placement flows stabilize.',
    },
    {
      id: 'export-rate-limiting-security',
      category: 'security',
      title: 'Rate limiting / pen-test hardening for exports and bulk actions',
      detail: 'Multiple same-day exports are audit-by-design; abuse controls are a separate security project.',
      source: 'Exploration F12',
    },
    {
      id: 'assessment-uploads-duplicate-nav',
      category: 'ux',
      title: 'Assessment uploads listed in two menu sections',
      detail:
        'Fixed in prior menu reorg: Assessment uploads (CSV) appears only under 👥 Recruitment & Selection. Candidate Pipeline is Applications + Offers only; Assessment map lives under Settings.',
      source: 'Exploration F27',
      decision: 'Done',
    },
    {
      id: 'assessment-terminology-drift',
      category: 'ux',
      title: 'Assessment naming — Hiring Assessment vs map vs uploads',
      detail:
        'Employer menu uses Hiring Results Dashboard (read), Assessment uploads (CSV), Assessment Update Online (write), Assessment map (Settings labels). College keeps Hiring Assessment (read-only mirror). Stale employer “Hiring Assessment” copy on Interview Scheduling fixed Jun 2026.',
      source: 'Exploration F28',
      decision: 'Done',
    },
    {
      id: 'student-registration-dead-code',
      category: 'cleanup',
      title: 'Remove dead student self-registration UI',
      detail: 'Students do not self-register. RegisterJobAidPanel / student register path obsolete; /register is employer + college admin only.',
      source: 'Exploration F1, F2',
    },
    {
      id: 'robots-sitemap',
      category: 'wishlist',
      title: 'Sitemap.xml (robots.txt added)',
      detail:
        'public/robots.txt — disallows /dashboard, /developer, /data-entry, /api. Sitemap still open: add public/sitemap.xml or src/app/sitemap.js when marketing URL is fixed.',
      source: 'Exploration recon',
      decision: 'robots.txt done Jun 2026',
    },
  ],
};

/** Demo email / notification pointers for QA (landing yopmail banner + in-app alerts). */
export const EMAIL_DEMO_NOTES = [
  'Disposable inbox for system mail in demos: placementhub@yopmail.com — check at https://yopmail.com/',
  'Data Tester seeded users use @placementhub.test (not YOPmail); password Admin@123.',
  'Student reminder / email copy preview (no mail sent): /dashboard/student/reminders after login.',
  'Super admin → Email delivery logs: search by recipient login email, context, or subject. Each row stores original → communication routing → final SMTP.',
  'Mail contexts for QA: student_selection, registration_approved, student_welcome, password_reset, email_verification, audit_report_export, feedback_reply, login_support — see User testing use cases.',
  'CLI: node scripts/query_mail_logs.js <email-or-context> from repo root (reads .env.local DATABASE_URL).',
  'Assessment round updates from CSV or Assessment Update Online appear on Hiring Results Dashboard (employer) and college Hiring Assessment (read-only).',
  'College Audit Reports → Export CSV can email a download link when SMTP is configured.',
];

/** Full reset + restore — primary cleanup path (documented on /developer#cleanup). */
export const CLEANUP_OVERVIEW =
  'After testing, wipe all jobs, internships, and placement drives, then restore demo tie-ups. Core logins (IITM / NITT / BITS + TechCorp) stay intact.';

export const CLEANUP_COMMANDS = [
  {
    title: 'Full wipe — all jobs, internships, drives (recommended)',
    command: 'npm run db:clear-placement',
    alt: 'node scripts/clear_all_placement_data.js',
    detail:
      'Hard-deletes every job posting (jobs + internships + projects + hackathons), all placement drives, applications, campus visibility, offers, and assessment uploads. Includes items created by demo accounts and Guided Runner GT-* posts. Does not remove colleges, users, students, or employers.',
    when: 'Clean slate before a demo or after a long QA session.',
  },
  {
    title: 'Soft-delete jobs & internships only (UI)',
    command: 'Developer Notes → Demo APIs → Jobs & internships → Delete all jobs & internships',
    alt: 'POST /api/demo/purge-all-jobs-internships',
    detail:
      'Marks job postings deleted in DB; may miss standalone drives. Prefer npm run db:clear-placement for a full reset.',
    when: 'Quick partial cleanup from Developer Notes.',
  },
  {
    title: 'Selective purge (one entity at a time)',
    command: 'Developer Notes → Demo APIs → Purge (soft delete)',
    alt: '/data-entry → Purge section',
    detail:
      'Soft-delete single sandbox rows: Data Tester API posts, GT-* titles, playbook Duration: N months. descriptions, seed ids d1000000-*.',
    when: 'Remove one bad test row without wiping everything.',
  },
  {
    title: 'Remove test college tenants (registration QA)',
    command: 'py -3 scripts/delete_test_college_tenants.py --dry-run',
    alt: 'py -3 scripts/delete_test_college_tenants.py',
    detail:
      'Deletes colleges created during registration tests (MIT WPU, COEP, duplicate IITM, etc.). Keeps iit-madras, nit-trichy, bits-pilani only. Cascades users, visibility, and drives for those tenants.',
    when: 'College admin list is cluttered with test campuses.',
  },
  {
    title: 'Remove test employers (keep 5 demo logins)',
    command: 'py -3 scripts/delete_test_employers.py --dry-run',
    alt: 'py -3 scripts/delete_test_employers.py  |  npm run db:delete-test-employers',
    detail:
      'Deletes every employer profile except hr@techcorp.com, hr@globalsoft.com, hr@infosys.com, talent@innoventlabs.ai, and careers@finedge.io. Cascades jobs, drives, tie-ups, offers, assessment CSV upload history (uploads, rows, import sessions), and Assessment Update Online contexts. Also removes orphan employer users from registration QA. Run without --dry-run to apply.',
    when: 'Employer list is cluttered with test companies not on /demo-accounts.',
  },
];

/** Run after a full wipe so employers can publish again. */
export const RESTORE_AFTER_CLEANUP = [
  {
    title: 'Restore demo campus ↔ employer tie-ups',
    command: 'Developer Notes → Demo APIs → Campus tie-ups → Restore all demo tie-ups',
    alt: 'POST /api/demo/ensure-all-tieups  body: { "scope": "demo" }',
    detail: 'Approves IIT Madras, NITT Trichy, and BITS Pilani with TechCorp, GlobalSoft, Infosys, Innovent Labs, and FinEdge. Safe to re-run.',
  },
  {
    title: 'TechCorp only — all active colleges',
    command: 'npm run qa:ensure-techcorp-partnerships',
    alt: 'node scripts/db_exec_sql_file.js db/seeds/ensure_techcorp_partnerships.sql',
    detail:
      'Upserts approved tie-ups for hr@techcorp.com with every active college tenant. Use when TechCorp shows no approved campuses, internship publish fails, or Applications → Internships shows partnership errors. Safe to re-run.',
    when: 'Guided internship playbook (EI-15/16) or TechCorp + Arjun Verma / IIT Madras QA.',
  },
  {
    title: 'Seed fresh postings (optional)',
    command: 'Developer Notes → Demo APIs → Create jobs / Create internships',
    alt: '/data-entry → Jobs & internships section',
    detail: 'Creates new published listings with campus visibility after tie-ups are restored.',
  },
  {
    title: 'All colleges × all employers (full grid)',
    command: 'POST /api/demo/ensure-all-tieups  body: { "scope": "all" }',
    alt: 'npm run qa:ensure-partnership',
    detail: 'Only if you need every employer approved on every active college — not required for standard demo.',
  },
];

/** @deprecated use CLEANUP_COMMANDS + RESTORE_AFTER_CLEANUP */
export const PURGE_NOTES = [
  CLEANUP_OVERVIEW,
  'Full wipe: npm run db:clear-placement (see Clean up & restore on /developer).',
  'Then restore tie-ups: Developer Notes → Demo APIs → Restore all demo tie-ups.',
  'Selective purge: Developer Notes → Demo APIs → Purge — GT-* and Data Tester rows one at a time.',
  'Test colleges: py -3 scripts/delete_test_college_tenants.py (--dry-run first).',
  'Test employers: py -3 scripts/delete_test_employers.py (--dry-run first) — keeps 5 demo employer logins only.',
];

export const LEGACY_RUNNER_COMMANDS = [
  { command: 'npm run qa:ensure-techcorp-partnerships', use: 'Approve TechCorp (hr@techcorp.com) on all active colleges — see Clean up & restore' },
  { command: 'npm run qa:sync-help-knowledge', use: 'Export docs/help/*.md + index for AI Help (OPENAI_API_KEY for embeddings; full corpus either way)' },
  { command: 'npm run qa:sync-routes', use: 'Regenerate qa/routes-by-role.js after dashboardMenu.js changes' },
  { command: 'npm run test:guided:drives', use: 'Browse Focus Areas placement-drive cases (navigation only; CSV still manual)' },
  { command: 'npm run test:guided:playbook-drives-e2e', use: 'Full placement drive cycle (employer → college → student → employer)' },
  { command: 'npm run test:guided:playbook-drives', use: 'Employer request drive + college approve' },
  { command: 'npm run test:guided:playbook-drives-apply', use: 'Student apply + employer shortlist/select (uses GT- marker)' },
  { command: 'npm run test:guided:internships', use: 'Browse Focus Areas internship cases (navigation only)' },
  { command: 'npm run test:guided -- --focus EI-03', use: 'Single Focus Area case' },
  { command: 'npm run test:guided -- --playbook <id>', use: 'Any playbook in qa/guided/playbooks/' },
  { command: 'qa/runners/batch/run-guided.ps1', use: 'Guided runner (PowerShell)' },
  { command: '..\\run-guided.ps1 (parent folder forwarder)', use: 'Same launcher from CampusPlacement parent' },
];

export const DATABASE_SCHEMA_NOTES = {
  href: '/developer/database-schema',
  repoPath: 'docs/help/developer/database-schema.md',
  overviewPath: 'docs/help/developer/database-relationships-overview.md',
  regenerateCommand: 'npm run db:generate-docs',
};

export const RELATED_DOCS = [
  { label: 'Use-case runner manifest', path: 'qa/guided/config/use-case-runners.json' },
  { label: 'Use-case tour steps (source)', path: 'qa/guided/config/use-case-tours.json' },
  { label: 'Build tour playbooks', path: 'npm run test:guided:build-uc-playbooks' },
  { label: 'More use cases (in-app)', path: 'src/content/developerNotes.js (USE_CASE_FLOWS_MORE)', href: '/developer/use-cases-more' },
  { label: 'User testing use cases (in-app)', path: 'src/content/developerNotes.js (USE_CASE_FLOWS_USER_TESTING)', href: '/developer/use-cases-user-testing' },
  { label: 'All use cases by role (in-app)', path: 'src/content/useCaseCatalog.js', href: '/developer/use-cases-by-role' },
  { label: 'Use-case auto runners', path: 'npm run qa:uc:list', hint: 'Headless playbook per slug' },
  { label: 'Validation error codes (VAL-…)', path: 'src/lib/validationErrorCode.js', hint: '[VAL-{FIELD}-{RULE}] prefix on form errors' },
  { label: 'Database schema & relationships', path: 'docs/help/developer/database-schema.md', href: '/developer/database-schema' },
  { label: 'Database relationships overview (source)', path: 'docs/help/developer/database-relationships-overview.md' },
  { label: 'Cleanup & restore (markdown)', path: 'docs/help/developer/purge.md' },
  { label: 'Delete test employers script', path: 'scripts/delete_test_employers.py' },
  { label: 'Delete test college tenants script', path: 'scripts/delete_test_college_tenants.py' },
  { label: 'Clear placement SQL', path: 'db/scripts/clear_all_placement_data.sql' },
  { label: 'Help library for Cursor / Claude (markdown)', path: 'docs/help/', hint: 'Point AI tools here; sync: npm run qa:sync-help-knowledge' },
  { label: 'Manual test playbook (CSV, cross-view)', path: 'qa/docs/manual-test-playbook.md' },
  { label: 'Runner quick start (repo file)', path: 'qa/docs/guided-runner-quickstart.md' },
  { label: 'Focus Areas JSON', path: 'qa/guided/config/focus-areas.json', hint: 'Rebuild: npm run qa:build-focus-areas' },
  { label: 'QA routes by role', path: 'qa/routes-by-role.js', hint: 'Rebuild: npm run qa:sync-routes' },
];
