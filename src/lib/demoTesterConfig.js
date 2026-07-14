/** Demo data tester actions and purge config (shared by /data-entry and landing panel). */

export const DEMO_ACTION_GROUPS = [
  {
    label: 'Students',
    items: [
      {
        id: 'create-student',
        title: 'Create student',
        hint: 'Random @placementhub.test · sandbox password · no offers',
        endpoint: '/api/demo/create-student',
        countDefault: 1,
        countMax: 5,
      },
    ],
  },
  {
    label: 'Campus tie-ups',
    items: [
      {
        id: 'ensure-all-tieups',
        title: 'Restore all demo tie-ups',
        hint: 'IITM, NITT, BITS × TechCorp, GlobalSoft, Infosys, Innovent, FinEdge — sets approved',
        endpoint: '/api/demo/ensure-all-tieups',
        bodyExtra: { scope: 'demo' },
        hideCount: true,
      },
      {
        id: 'ensure-iitm-tieup',
        title: 'Ensure IIT Madras tie-up (demo employers)',
        hint: 'Legacy: IIT Madras only · use Restore all demo tie-ups above',
        endpoint: '/api/demo/ensure-iitm-tieup',
        hideCount: true,
      },
    ],
  },
  {
    label: 'Jobs & internships',
    items: [
      {
        id: 'create-jobs',
        title: 'Create jobs (full-time)',
        hint: 'Published + campus visibility · auto employer tie-up',
        endpoint: '/api/demo/create-jobs',
        countDefault: 2,
        countMax: 10,
      },
      {
        id: 'create-internships',
        title: 'Create internships',
        hint: 'Published internship postings for campus',
        endpoint: '/api/demo/create-internships',
        countDefault: 2,
        countMax: 10,
      },
      {
        id: 'apply-to-job',
        title: 'Student applies to job',
        hint: 'Random unplaced demo student → random visible job',
        endpoint: '/api/demo/apply-to-job',
        hideCount: true,
      },
      {
        id: 'apply-to-internship',
        title: 'Student applies to internship',
        hint: 'Demo-screen student → random visible internship',
        endpoint: '/api/demo/apply-to-internship',
        hideCount: true,
      },
      {
        id: 'purge-all-jobs-internships',
        title: 'Delete all jobs & internships',
        hint: 'Soft-delete every job/internship posting and permanently delete all in-app alerts',
        endpoint: '/api/demo/purge-all-jobs-internships',
        hideCount: true,
      },
    ],
  },
  {
    label: 'Placement drives',
    items: [
      {
        id: 'request-drive',
        title: 'Request drive',
        hint: 'Employer drive → status Requested (college must approve)',
        endpoint: '/api/demo/placement-drive',
        bodyExtra: { step: 'request' },
        hideCount: true,
      },
      {
        id: 'request-approve-drive',
        title: 'Request + approve drive',
        hint: 'Creates drive already Approved (skip college UI)',
        endpoint: '/api/demo/placement-drive',
        bodyExtra: { step: 'request-approve' },
        hideCount: true,
      },
      {
        id: 'approve-drive',
        title: 'Approve drive',
        hint: 'Approves latest Requested drive on campus',
        endpoint: '/api/demo/placement-drive',
        bodyExtra: { step: 'approve' },
        hideCount: true,
      },
      {
        id: 'apply-to-drive',
        title: 'Student applies to drive',
        hint: 'Demo student → random approved/scheduled drive',
        endpoint: '/api/demo/placement-drive',
        bodyExtra: { step: 'apply' },
        hideCount: true,
      },
    ],
  },
  {
    label: 'Selection (employer simulation)',
    items: [
      {
        id: 'shortlist-application',
        title: 'Shortlist latest application',
        hint: 'Most recent demo program or drive application → shortlisted',
        endpoint: '/api/demo/advance-application',
        bodyExtra: { status: 'shortlisted', channel: 'any' },
        hideCount: true,
      },
      {
        id: 'select-application',
        title: 'Select latest application',
        hint: 'Same as above → selected',
        endpoint: '/api/demo/advance-application',
        bodyExtra: { status: 'selected', channel: 'any' },
        hideCount: true,
      },
    ],
  },
];

export const DEMO_FLAT_ACTIONS = DEMO_ACTION_GROUPS.flatMap((g) => g.items);

export const DEMO_PURGE_GROUPS = [
  { key: 'jobs', label: 'Jobs (full-time)', entityType: 'job' },
  { key: 'internships', label: 'Internships & programs', entityType: 'internship' },
  { key: 'drives', label: 'Placement drives', entityType: 'drive' },
  { key: 'students', label: 'Students', entityType: 'student' },
  { key: 'programApplications', label: 'Program applications', entityType: 'program_application' },
  { key: 'driveApplications', label: 'Drive applications', entityType: 'drive_application' },
];

export const DEMO_PURGE_LIST_KEY_BY_ENTITY = Object.fromEntries(
  DEMO_PURGE_GROUPS.map((g) => [g.entityType, g.key]),
);

export function demoPurgeRemainingCount(candidates) {
  if (!candidates) return 0;
  return DEMO_PURGE_GROUPS.reduce((n, g) => n + (candidates[g.key] || []).length, 0);
}

export function demoPurgeOptionKey(item) {
  return `${item.entityType}:${item.entityId}`;
}

export function flattenDemoPurgeCandidates(candidates, typeFilter = 'all') {
  if (!candidates) return [];
  const out = [];
  for (const group of DEMO_PURGE_GROUPS) {
    if (typeFilter !== 'all' && group.entityType !== typeFilter) continue;
    for (const item of candidates[group.key] || []) {
      out.push({
        ...item,
        groupLabel: group.label,
        optionKey: demoPurgeOptionKey(item),
        optionLabel: `[${group.label}] ${item.label}${item.sub ? ` — ${item.sub}` : ''}`,
      });
    }
  }
  return out;
}

export function formatDemoRunForDownload(run) {
  return JSON.stringify(run, null, 2);
}
