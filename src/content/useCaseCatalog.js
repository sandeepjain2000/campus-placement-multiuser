/**
 * Master use-case catalog — roles, UC ids, runner slugs, playbooks.
 * Consumed by Developer Notes and QA runners.
 */

export const USE_CASE_ROLE_LABELS = {
  student: 'Student',
  employer: 'Employer',
  college_admin: 'College admin',
  super_admin: 'Super admin',
};

/**
 * @type {Record<string, { ucId?: string, roles: string[], playbook?: string, apiRunner?: boolean }>}
 */
export const USE_CASE_META_BY_SLUG = {
  'placement-drive-full': { ucId: 'UC-002', roles: ['employer', 'college_admin', 'student'], playbook: 'drives-full-cycle' },
  'internship-publish-hire': { ucId: 'UC-INTERNSHIP-E2E', roles: ['employer', 'college_admin', 'student'], playbook: 'internships-full-cycle' },
  'student-verified-first-app': { ucId: 'UC-009', roles: ['college_admin', 'student'], playbook: 'student-verified-first-app' },
  'assessment-csv': { ucId: 'UC-006', roles: ['employer', 'college_admin'], playbook: 'assessment-csv' },
  'campus-partnership-posting': { ucId: 'UC-001', roles: ['employer', 'college_admin', 'student'], playbook: 'campus-partnership-posting' },
  'offer-accept-lock': { ucId: 'UC-005', roles: ['employer', 'college_admin', 'student'], playbook: 'offer-accept-lock' },
  'assessment-update-online': { ucId: 'UC-006', roles: ['employer', 'college_admin'], playbook: 'assessment-update-online' },
  clarifications: { ucId: 'UC-008', roles: ['college_admin', 'student', 'employer'], playbook: 'clarifications', apiRunner: true },
  'interview-scheduling': { ucId: 'UC-004', roles: ['employer', 'college_admin', 'student'], playbook: 'interview-scheduling' },
  'full-time-job': { ucId: 'UC-003', roles: ['employer', 'college_admin', 'student'], playbook: 'full-time-job' },
  'employer-registration': { ucId: 'UC-001', roles: ['employer', 'super_admin'], playbook: 'employer-registration' },
  'password-reset': { roles: ['student', 'employer', 'college_admin', 'super_admin'], playbook: 'password-reset' },
  'bulk-student-import': { roles: ['college_admin', 'student'], playbook: 'bulk-student-import' },
  'sponsorship-receipt': { roles: ['college_admin'], playbook: 'sponsorship-receipt' },
  'interview-slot-notify': { ucId: 'UC-004', roles: ['employer', 'student'], playbook: 'interview-slot-notify' },
  'college-offers-upload': { ucId: 'UC-007', roles: ['college_admin', 'student'], playbook: 'college-offers-upload' },
  'email-delivery-audit': { ucId: 'UC-010', roles: ['super_admin'], playbook: 'email-delivery-audit' },
  'communication-email-routing': { roles: ['super_admin'], playbook: 'communication-email-routing' },
  'session-ads-toggle': { roles: ['super_admin'], playbook: 'session-ads-toggle' },
  'audit-report-export': { roles: ['college_admin', 'super_admin'], playbook: 'audit-report-export' },
  'login-support-feedback': { roles: ['student', 'employer', 'college_admin', 'super_admin'], playbook: 'login-support-feedback' },
  'data-export-notice': { roles: ['student', 'employer', 'college_admin', 'super_admin'], playbook: 'data-export-notice' },
  'internship-guides-feedback-supervisors': { roles: ['college_admin', 'employer', 'student'], playbook: 'internship-guides-feedback-supervisors' },
  'guest-engagement': { roles: ['college_admin', 'employer', 'super_admin'], playbook: 'guest-engagement', apiRunner: true },
  'college-internship-approve': { roles: ['college_admin', 'employer', 'student'], playbook: 'internships-employer-publish' },
  'admin-governance': { ucId: 'UC-010', roles: ['super_admin'], playbook: 'admin-governance' },
};

/**
 * @param {{ name: string, runnerSlug?: string, steps: string[] }} flow
 */
export function enrichUseCaseFlow(flow) {
  const slug = flow.runnerSlug || '';
  const meta = USE_CASE_META_BY_SLUG[slug] || { roles: [] };
  return {
    ...flow,
    ucId: meta.ucId || null,
    roles: meta.roles || [],
    playbook: meta.playbook || slug,
    apiRunner: Boolean(meta.apiRunner),
  };
}

/**
 * @param {ReturnType<typeof enrichUseCaseFlow>[]} flows
 */
export function groupUseCasesByRole(flows) {
  /** @type {Record<string, ReturnType<typeof enrichUseCaseFlow>[]>} */
  const byRole = {
    student: [],
    employer: [],
    college_admin: [],
    super_admin: [],
  };
  for (const flow of flows) {
    for (const role of flow.roles) {
      if (byRole[role]) byRole[role].push(flow);
    }
  }
  return byRole;
}

export function useCaseAutoRunnerCommand(slug) {
  return `npm run qa:uc -- ${slug}`;
}

export function useCaseApiRunnerCommand(slug) {
  return `npm run qa:uc:api -- ${slug}`;
}
