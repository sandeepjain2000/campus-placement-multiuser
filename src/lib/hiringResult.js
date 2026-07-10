export const HIRING_RESULT_APPLIED = 'Applied';
export const HIRING_RESULT_NOT_APPLIED = 'Not Applied';

/** Allowed hiring_result values in UI and CSV. */
export const HIRING_RESULT_OPTIONS = [
  { value: HIRING_RESULT_APPLIED, label: 'Applied' },
  { value: HIRING_RESULT_NOT_APPLIED, label: 'Not Applied' },
  { value: 'Shortlist', label: 'Shortlist' },
  { value: 'Reject', label: 'Reject' },
  { value: 'Select', label: 'Select' },
  { value: 'Decline', label: 'Decline' },
  { value: 'Withdraw', label: 'Withdraw' },
];

const ALLOWED_CANONICAL = new Map(
  HIRING_RESULT_OPTIONS.filter((o) => o.value).map((o) => [o.value.toLowerCase(), o.value]),
);

/** Common CSV / Excel variants → canonical hiring_result. */
const HIRING_RESULT_ALIASES = new Map([
  ['selected', 'Select'],
  ['shortlisted', 'Shortlist'],
  ['rejected', 'Reject'],
  ['reject', 'Reject'],
  ['declined', 'Decline'],
  ['withdrawn', 'Withdraw'],
  ['not applied', 'Not Applied'],
]);

/** Map hiring_result to applications / program_applications.status when employer confirms via CSV or online. */
const HIRING_TO_APPLICATION_STATUS = new Map([
  ['Select', 'selected'],
  ['Shortlist', 'shortlisted'],
  ['Reject', 'rejected'],
  ['Withdraw', 'withdrawn'],
  ['Decline', 'rejected'],
]);

/** Normalize CSV/UI input to canonical casing or empty string. */
export function normalizeHiringResult(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  const hit = ALLOWED_CANONICAL.get(lower) || HIRING_RESULT_ALIASES.get(lower);
  return hit || '';
}

/** @returns {string | null} application status to sync, or null to leave unchanged */
export function applicationStatusFromHiringResult(raw) {
  const canonical = normalizeHiringResult(raw);
  if (!canonical) return null;
  return HIRING_TO_APPLICATION_STATUS.get(canonical) || null;
}

/** @returns {string | null} error message, or null if valid (empty allowed) */
export function validateHiringResult(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (normalizeHiringResult(s)) return null;
  return `Invalid hiring_result "${s}". Use: ${HIRING_RESULT_OPTIONS.filter((o) => o.value).map((o) => o.value).join(', ')}.`;
}

export function hiringResultSelectOptions() {
  return HIRING_RESULT_OPTIONS;
}

/** Stored employer decision wins; otherwise derive Applied / Not Applied from application status. */
export function resolveInitialHiringResult(storedHiringResult, hasApplied) {
  const stored = normalizeHiringResult(storedHiringResult);
  if (stored) return stored;
  return hasApplied ? HIRING_RESULT_APPLIED : HIRING_RESULT_NOT_APPLIED;
}
