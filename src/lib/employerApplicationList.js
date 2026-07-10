import { sqlEmployerTieUpIsActive } from '@/lib/employerTieUp';
import { isWithdrawnApplicationStatus } from '@/lib/applicationWithdrawal';

/** Active campus tie-up filter — EXISTS avoids row multiplication from duplicate approvals. */
export function sqlActiveCampusTieUpForStudent(employerCol) {
  return `AND EXISTS (
    SELECT 1 FROM employer_approvals ea_campus
    WHERE ea_campus.tenant_id = sp.tenant_id
      AND ea_campus.employer_id = ${employerCol}
      AND ${sqlEmployerTieUpIsActive('ea_campus')}
  )`;
}

const ALLOWED_APPLICATION_STATUSES = new Set([
  'applied',
  'shortlisted',
  'in_progress',
  'selected',
  'rejected',
  'withdrawn',
  'on_hold',
]);

/** Per-opening status only — never infer from sibling applications or FCFS. */
export function normalizeEmployerApplicationStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return ALLOWED_APPLICATION_STATUSES.has(s) ? s : 'applied';
}

/** Collapse duplicate rows from accidental join fan-out (same application id). */
export function dedupeEmployerApplicationItems(items) {
  if (!Array.isArray(items) || items.length < 2) return items || [];

  const byKey = new Map();
  for (const item of items) {
    const key = `${item?.sourceKind || 'unknown'}:${item?.id || ''}`;
    if (!key.endsWith(':') && !byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return byKey.size === items.length ? items : Array.from(byKey.values());
}

export function employerMayUpdateApplicationStatus(currentStatus, nextStatus) {
  if (isWithdrawnApplicationStatus(currentStatus)) {
    return { ok: false, error: 'Withdrawn applications cannot be updated.' };
  }
  if (!ALLOWED_APPLICATION_STATUSES.has(String(nextStatus || '').trim().toLowerCase())) {
    return { ok: false, error: 'Invalid status.' };
  }
  return { ok: true };
}

/** Send selection email/in-app alert only on first transition to selected (not re-select). */
export function shouldNotifyStudentSelectionOnStatusChange(currentStatus, nextStatus) {
  if (normalizeEmployerApplicationStatus(nextStatus) !== 'selected') return false;
  return normalizeEmployerApplicationStatus(currentStatus) !== 'selected';
}
