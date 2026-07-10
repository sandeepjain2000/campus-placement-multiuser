/**
 * Shared help documentation sections (dashboard + public /help).
 * Icons are applied in HelpDocumentationView.
 */

export const HELP_SECTIONS = [
  {
    id: 'platform-basics',
    title: 'Platform basics',
    items: [
      {
        id: 'what-is-placementhub',
        title: 'What is PlacementHub?',
        content: `PlacementHub is a campus placement and engagement platform. It connects students, college placement teams (TPOs), and employers on one system: job postings and drives, applications, interviews, offers, clarifications, calendars, and reporting.

Your experience depends on your role: students see drives and applications; employers manage hiring and campus partnerships; college admins run the placement season; super admins operate the whole tenant.`,
      },
      {
        id: 'roles-overview',
        title: 'Roles at a glance',
        content: `Student — apply to drives, manage profile and documents, view interviews and offers, read published clarifications, join discussions where enabled.

Employer — maintain company profile, request campus tie-ups, post jobs and drives, record assessment round results (CSV or online), run interviews, manage offers.

College admin — approve employers and students, publish drives visibility, manage enrollment keys, interviews, clarifications, campus calendar, rules, and reports.

Super admin — onboard colleges and employers, approve pending registrations, manage users, platform settings, and audit visibility.`,
      },
      {
        id: 'navigation',
        title: 'Navigation, home, and sidebar',
        content: `After sign-in you land on your role home (student / employer / college / admin hub). Use the sidebar to move between sections; on smaller screens, open the menu from the top bar.

The full-screen hub lists every destination in grouped columns. Your last-used section is remembered. Use the in-dashboard search (where available) to jump to a screen by name.`,
      },
      {
        id: 'alerts-exports-feedback',
        title: 'Alerts, exports, and feedback',
        content: `Alerts — central inbox for notifications (bell). Check regularly for deadlines and status changes.

Help (sparkle button) — ask natural-language questions; answers are generated from indexed help documentation, developer QA notes, and FAQs. After major doc updates, admins run npm run qa:sync-help-knowledge (requires OPENAI_API_KEY for best semantic search).

My data export — request downloadable exports of your data where the product supports it (GDPR-style self-service).

Feedback — send product feedback from the Feedback entry in your menu; college and super-admin teams may have separate inboxes for triage.`,
      },
    ],
  },
  {
    id: 'use-case-flows',
    title: 'Use case flows',
    items: [
      {
        id: 'flow-student',
        title: 'Student — typical placement journey',
        diagramId: 'flow-student',
        content: `Goal: get verified, discover opportunities, apply, interview, and respond to offers within your college’s rules.

1. Register (or sign in) with your institute email and the campus enrollment key from the placement office.
2. Complete My Profile and upload Documents (resume, proofs). Wait for college verification if required.
3. Browse Drives and use filters (mode, status, month/year). Add interesting drives to your mental shortlist via the Placement calendar.
4. Apply before each drive’s deadline. Track everything under My Applications.
5. Watch Alerts for interview slots and updates. Open My Interviews when schedules go live.
6. Read Clarifications for official company Q&A from your TPO. Use Discussions only where your college enables them.
7. When you receive an offer, open My Offers and follow your institute’s acceptance / decline process.

Tip: if something is blocked, check profile verification and eligibility (CGPA, branch) before contacting support.`,
      },
      {
        id: 'flow-employer',
        title: 'Employer — hire on a campus',
        diagramId: 'flow-employer',
        content: `Goal: be approved on the right campuses, publish roles, run selection, and close offers.

1. Complete Company Profile (logo, description, contacts) so colleges and students trust your brand.
2. Under Campus Partnerships, request tie-ups with target institutes. Track Approved vs Pending; follow up with the TPO if needed.
3. When working on more than one campus, pick the Active campus so jobs and drives target the correct audience.
4. Create Job Postings with clear eligibility (branches, CGPA, batch). Schedule Placement Drives (mode, venue, dates) and link them to roles.
5. Record assessment round results: set round display names in Assessment map, then use Assessment uploads (CSV) or Assessment Update Online. Review outcomes on Hiring Results Dashboard (read-only). Run Interview Scheduling and review Applications as agreed with the college.
6. Record Offers individually or via bulk CSV from the Offers page (upload link on that screen — not in the sidebar). Coordinate Sponsorships or guest sessions if you use those modules.
7. Respond to Clarification batches and join Discussions when the college publishes threads.

Tip: no campus unlocked usually means partnership is still pending — resolve that before expecting student applications.`,
      },
      {
        id: 'flow-college',
        title: 'College admin (TPO) — run the season',
        diagramId: 'flow-college',
        content: `Goal: keep employers and students aligned, enforce rules, and maintain a fair, auditable season.

1. Set season context in Settings (placement season label, branding, policies your product exposes).
2. Manage Employers: approve or reject partnership requests before companies run drives on your campus.
3. Publish or curate Placement Drives / Internships visibility as your process requires. Keep the Enrollment key secure; rotate it if it leaks.
4. Verify Students from the Students screen so eligible candidates are not blocked by the “pending approval” state.
5. Operate selection support: Hiring Assessment (read-only mirror of employer CSV/online updates), Interview Scheduling coordination, and monitoring Applications / Offers (bulk offers CSV via the Offers page when used).
6. Publish Clarifications (batched Q&A to companies) and moderate Discussions where enabled.
7. Use Calendar, Events, and Guest faculty / lectures to communicate visit days and engagement.
8. Enforce Placement Rules and use Reports / Audit reports for compliance and leadership reviews.

Tip: treat the enrollment key like a password — only share through official channels.`,
      },
      {
        id: 'flow-super-admin',
        title: 'Super admin — operate the platform',
        diagramId: 'flow-super-admin',
        content: `Goal: onboard organizations, keep accounts healthy, and maintain global configuration.

1. Monitor the Dashboard for cross-tenant health and backlog.
2. Maintain Colleges and Employers records as your commercial or pilot process requires.
3. Work Onboard colleges & employers: activate college and employer accounts that require platform approval before first login.
4. Support Users (search, fixes, lockouts) and triage the Feedback inbox.
5. Review Audit reports when investigating incidents or compliance questions.
6. Adjust Settings for SMTP, storage, feature flags, and other global parameters.

Tip: changes here affect every tenant — document major setting updates for your ops team.`,
      },
      {
        id: 'flow-cross-role',
        title: 'How the roles connect (one season story)',
        diagramId: 'flow-cross-role',
        content: `This is a simplified “everyone in one flow” view:

Super admin enables a new college and employer on the platform → College admin shares the enrollment key with students and approves the employer partnership → Employer posts jobs and schedules a drive for that campus → Students apply and move through interviews → College admin and employer coordinate slots and clarifications → Offers are recorded and college rules (e.g. offer limits) apply → Reports close the loop for leadership.

Your deployment may skip steps (e.g. auto-approved employers) or add steps (extra assessments). Use the role-specific flows above as the source of truth for day-to-day work.`,
      },
    ],
  },
  {
    id: 'students',
    title: 'Students',
    items: [
      {
        id: 'student-profile',
        title: 'Profile, verification, and documents',
        content: `Complete My Profile with accurate academics, contact details, and links. Your college may require verification before certain placement steps; until then you may see a banner — contact your TPO if you are stuck.

Documents — upload resumes, certificates, and ID proofs. Follow any naming guidance from your institute. Replace files when you update your resume.`,
      },
      {
        id: 'student-drives-apps',
        title: 'Drives, calendar, applications, interviews, offers',
        content: `Browse Drives — filter by mode (on-campus / virtual / hybrid / off-campus), status, and date (including month–year). Apply before the deadline where the drive is open.

Placement calendar — see drive-related dates in a calendar view.

My Applications — track status from applied through shortlisting and selection.

My Interviews — follow schedules your college or employer publishes.

My Offers — review and act on offers according to your college rules.`,
        screenshot: {
          src: '/help/help-student-drives.png',
          alt: 'Illustration of a student Browse Drives screen with filters and company drive cards',
          caption: 'Illustrative UI: Browse Drives with search, date filters, and drive cards (your live screen may differ slightly).',
        },
      },
      {
        id: 'student-programs-comms',
        title: 'Internships, projects, clarifications, discussions',
        content: `Internships & Projects — explore structured programs your college or employers expose.

Clarifications — read official Q&A batches published by your placement committee for companies (not a private chat).

Discussions — participate in moderated threads where your college enables them.`,
      },
      {
        id: 'student-misc',
        title: 'Alerts, exports, and tips',
        content: `Use Alerts for time-sensitive messages. Use My data export if you need a copy of your data.

Tip: keep your phone and department consistent with institute records to avoid mismatches during shortlisting.`,
      },
    ],
  },
  {
    id: 'employers',
    title: 'Employers',
    items: [
      {
        id: 'employer-profile-campus',
        title: 'Company profile and campus partnerships',
        content: `Company Profile — logo, description, and contacts build trust with colleges and candidates.

Campus Partnerships — request tie-ups with institutes. Until a college approves you, some campus-scoped actions may be limited. Pick an active campus when working across multiple partnerships (session selection).

Events Calendar — align on visit days and shared milestones.`,
        screenshot: {
          src: '/help/help-employer-partnerships.png',
          alt: 'Illustration of employer Campus Partnerships table with status and request actions',
          caption: 'Illustrative UI: Campus Partnerships — request tie-ups and track approved / pending colleges.',
        },
      },
      {
        id: 'employer-jobs-drives',
        title: 'Jobs, drives, internships, and projects',
        content: `Job Postings — create roles with compensation bands, skills, and eligibility (branches, CGPA, batch).

Placement Drives — schedule drives linked to jobs; set mode and venue details.

Internships & Projects — publish student programs separate from full-time drives where configured.`,
      },
      {
        id: 'employer-pipeline',
        title: 'Assessments, interviews, applications, offers',
        content: `Assessment map — optional legacy screen to configure display names for round_1…round_5 per opportunity type. Hiring results now use a single hiring_result column (Shortlist, Reject, Select, Decline, Withdraw); the map is not used by CSV upload or online update.

Assessment uploads (CSV) — tabbed by opportunity type. Select campus and target, export all campus students for the current academic year, fill hiring_result, and upload. Failed rows can be corrected on the import review screen before accepting.

Assessment Update Online — set hiring_result inline for campus students (same data as CSV).

Hiring Results Dashboard — consolidated view of hiring_result by tab (draft and submitted); export available.

Interview Scheduling — propose or confirm slots; students see updates on their side.

Applications — review the candidate pipeline with filters.

Offers — record outcomes individually. Bulk offers CSV opens from the Offers page (link on that screen); it is not a separate sidebar menu item.`,
      },
      {
        id: 'employer-assessments-detail',
        title: 'Assessment CSV workflow (step by step)',
        diagramId: 'flow-employer-assessment',
        content: `Use this when you need to record hiring outcomes for many students at once.

1. Open Assessment uploads (CSV) or Assessment Update Online and pick the tab (Internship, Jobs, Drive, or Projects).
2. Select campus and drive/job target.
3. Click Export CSV — the file lists all campus students for the current academic year with columns system_id, college_roll_no, placement_drive_id, job_id, tenant_id, candidate_name, hiring_result, remarks.
4. Fill hiring_result offline (allowed values: Shortlist, Reject, Select, Decline, Withdraw; blank = no decision). Save as CSV.
5. Upload the file. If validation fails, fix rows on the import review screen and Accept; otherwise rows import immediately.
6. Submit results when finished — after submit, hiring_result cannot be changed from CSV or online update.
7. Confirm on Hiring Results Dashboard. The college sees the same data on Hiring Assessment (read-only).

Alternative: use Assessment Update Online to set hiring_result in the browser and Save — no file required. CSV and online updates can be combined; both appear on the dashboard.

Assessment updates do not send email to students; they appear in dashboard views only.`,
      },
      {
        id: 'employer-engagement',
        title: 'Sponsorships, guest needs, discussions',
        content: `Sponsorships — manage sponsorship opportunities you offer campuses.

Campus guest needs — coordinate lectures or guest sessions.

Clarifications — answer official Q&A batches from the placement committee.

Discussions — message threads with your active campus when the college enables them.`,
      },
    ],
  },
  {
    id: 'college-admins',
    title: 'College admins (TPO)',
    items: [
      {
        id: 'college-overview-settings',
        title: 'Dashboard, settings, and employers',
        content: `Dashboard — snapshot of season activity, pending work, and key metrics.

Settings — placement season label, branding, timezone, and policies your product exposes.

Employers — directory of companies; use Partnership Requests to approve or reject employer tie-up requests before they run drives at your campus.`,
      },
      {
        id: 'college-drives-students',
        title: 'Drives, students, enrollment, applications, offers',
        content: `Placement Drives & Internships — curate what runs on campus; align internship results where tracked.

Students — verify student profiles, fix data issues, and enforce placement rules.

Enrollment key — rotate or copy the campus enrollment key students use at registration; treat it like a secret.

Applications & Offers — monitor pipeline health. Bulk offers CSV is linked from the Offers page (not a separate sidebar item).`,
        screenshot: {
          src: '/help/help-college-students.png',
          alt: 'Illustration of college admin Students list with verification and roll numbers',
          caption: 'Illustrative UI: Students — verify profiles and keep enrollment data aligned with your records.',
        },
      },
      {
        id: 'college-selection-comms',
        title: 'Assessments, interviews, clarifications, discussions',
        content: `Hiring Assessment — read-only view of employer assessment round results for your campus (from Assessment uploads (CSV) or Assessment Update Online). Export for reporting; you cannot edit employer-submitted rows here.

Interview Scheduling — coordinate panels and slots with employers.

Clarifications (publish) — batch student questions for employers and publish official answers.

Discussions — moderate employer–student discussion spaces.`,
      },
      {
        id: 'college-engagement-admin',
        title: 'Calendar, events, guest faculty, rules, reports',
        content: `Calendar & Events — publish campus placement and engagement events.

Guest faculty & lectures — track guest engagements tied to placement.

Placement Rules — CGPA thresholds, offer limits, and season constraints.

Infrastructure — rooms, labs, or logistics your placement office tracks.

Reports & Audit reports — export operational and compliance views where available.`,
      },
    ],
  },
  {
    id: 'super-admin',
    title: 'Super admin',
    items: [
      {
        id: 'admin-scope',
        title: 'Platform operations',
        content: `Super admins manage the multi-tenant platform: colleges, employers, and users across the system.

Dashboard — cross-tenant overview.

Colleges & Employers — create or maintain org records as your deployment requires.

Onboard colleges & employers — activate or reject college and employer signups that require platform approval.

Users — search and support account issues.

Feedback inbox — triage product and support feedback.

Audit reports — access audit trails where enabled.

Settings — global SMTP, storage, feature flags, and other platform parameters.`,
        screenshot: {
          src: '/help/help-super-admin.png',
          alt: 'Illustration of super admin platform overview with sidebar navigation',
          caption: 'Illustrative UI: Platform administration — colleges, registrations, users, and settings.',
        },
      },
    ],
  },
  {
    id: 'accounts-security',
    title: 'Accounts & registration',
    items: [
      {
        id: 'student-registration',
        title: 'Student registration (campus key)',
        content: `Students join with the campus enrollment key from the placement office — not a roll number. Keys are long opaque values; paste them exactly (spaces are usually ignored).

You will also enter department, roll number, and batch year as your college defines them. If registration fails, confirm the key is current and that your email is not already registered.`,
      },
      {
        id: 'employer-college-signup',
        title: 'Employer and new college signup',
        content: `Some deployments require platform approval for new employers or new colleges. You may be able to sign in only after a super admin activates the account. Watch for email or TPO communication.`,
      },
      {
        id: 'sessions',
        title: 'Sessions and sign-out',
        content: `Sessions expire after a period of inactivity for security. Sign out on shared computers. If you change role or permissions, sign in again to refresh your session.`,
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    items: [
      {
        id: 'common-issues',
        title: 'Common issues',
        content: `Cannot apply to a drive — check deadlines, eligibility (CGPA / branch), drive status, and whether your profile is verified.

Employer: no campus — complete partnership approval and select an active campus.

Assessment CSV rejected — confirm round labels are saved in Assessment map; use Export CSV column layout; check roll numbers exist in the campus master list.

Cannot find Upload offers (CSV) in the sidebar — open Offers and use the upload link on that page.

Missing data — refresh the page; if the API failed, try again later. Persistent errors may indicate maintenance or configuration.

Still stuck — use Feedback from your dashboard or contact your placement office / platform support with your role, page URL, and approximate time of the issue.`,
      },
    ],
  },
];

/** Step-by-step flowcharts and use-case layout for help articles */
export const HELP_DIAGRAMS = {
  'flow-student': {
    type: 'flow',
    caption: 'Student placement journey — main steps from registration to offer decision.',
    steps: [
      { label: 'Register', detail: 'Enrollment key + email' },
      { label: 'Profile & docs', detail: 'Resume, verification' },
      { label: 'Browse drives', detail: 'Filters & calendar' },
      { label: 'Apply', detail: 'Before deadline' },
      { label: 'Interviews', detail: 'Alerts & schedules' },
      { label: 'Offers', detail: 'Accept / decline' },
    ],
  },
  'flow-employer': {
    type: 'flow',
    caption: 'Employer campus hiring — partnership through offers.',
    steps: [
      { label: 'Company profile', detail: 'Brand & contacts' },
      { label: 'Campus tie-up', detail: 'Partnership approved' },
      { label: 'Jobs & drives', detail: 'Eligibility & dates' },
      { label: 'Selection', detail: 'CSV or online update' },
      { label: 'Offers', detail: 'Record / CSV via Offers' },
      { label: 'Clarifications', detail: 'Official Q&A' },
    ],
  },
  'flow-college': {
    type: 'flow',
    caption: 'College TPO season — governance and student/employer coordination.',
    steps: [
      { label: 'Settings', detail: 'Season & policies' },
      { label: 'Approve employers', detail: 'Partnership requests' },
      { label: 'Verify students', detail: 'Enrollment key' },
      { label: 'Drives live', detail: 'Visibility & rules' },
      { label: 'Interviews', detail: 'Slots & panels' },
      { label: 'Reports', detail: 'Audit & compliance' },
    ],
  },
  'flow-super-admin': {
    type: 'flow',
    caption: 'Super admin — tenant onboarding and platform health.',
    steps: [
      { label: 'Dashboard', detail: 'Cross-tenant view' },
      { label: 'Onboard orgs', detail: 'Colleges & employers' },
      { label: 'Registrations', detail: 'Activate accounts' },
      { label: 'Users & feedback', detail: 'Support inbox' },
      { label: 'Settings', detail: 'SMTP, storage, flags' },
    ],
  },
  'flow-employer-assessment': {
    type: 'flow',
    caption: 'Employer assessment results — map labels, then CSV or online update.',
    steps: [
      { label: 'Assessment map', detail: 'Round display names' },
      { label: 'Export CSV', detail: 'Per opportunity tab' },
      { label: 'Edit rounds', detail: 'Or use Update Online' },
      { label: 'Upload / Save', detail: 'CSV or inline' },
      { label: 'Hiring Results', detail: 'Read-only review' },
      { label: 'College view', detail: 'Hiring Assessment' },
    ],
  },
  'flow-cross-role': {
    type: 'usecase',
    caption: 'Use case view — who interacts with PlacementHub in a typical placement season.',
    hub: 'PlacementHub',
    actors: [
      { id: 'student', label: 'Student', uses: ['Apply to drives', 'Profile & documents', 'Interviews & offers'] },
      { id: 'employer', label: 'Employer', uses: ['Jobs & drives', 'Applications pipeline', 'Offers & clarifications'] },
      { id: 'college', label: 'College TPO', uses: ['Verify students', 'Approve employers', 'Rules & reports'] },
      { id: 'super', label: 'Super admin', uses: ['Onboard colleges & employers', 'Platform settings'] },
    ],
    seasonFlow: [
      'Super admin enables college + employer',
      'TPO approves partnership & shares enrollment key',
      'Employer publishes drive → students apply',
      'Interviews & clarifications',
      'Offers recorded → reports',
    ],
  },
};
