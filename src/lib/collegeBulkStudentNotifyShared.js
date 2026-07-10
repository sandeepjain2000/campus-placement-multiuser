import { formatDate } from '@/lib/utils';

/**
 * @param {number | string} batchYear
 */
export function normalizeBatchYear(batchYear) {
  const n = Number(batchYear);
  if (!Number.isFinite(n) || n < 1990 || n > 2100) return null;
  return Math.trunc(n);
}

/**
 * @param {unknown} branches
 * @param {boolean} allBranches
 */
export function normalizeBranchSelection(branches, allBranches) {
  if (allBranches) return { allBranches: true, branches: [] };
  const list = Array.isArray(branches)
    ? [...new Set(branches.map((b) => String(b || '').trim()).filter(Boolean))]
    : [];
  return { allBranches: false, branches: list };
}

/**
 * @param {{ company: string; title: string; driveDate?: string | Date | null }} drive
 */
export function buildDriveReminderDefaults(drive) {
  const company = String(drive?.company || 'Company').trim();
  const title = String(drive?.title || 'Placement drive').trim();
  const dateLabel = drive?.driveDate ? formatDate(drive.driveDate) : 'See PlacementHub for schedule';
  return {
    alertTitle: `Upcoming drive — ${company}`,
    alertMessage: `${company} — ${title}. Drive date: ${dateLabel}. Review eligibility and apply on Browse Drives if you have not already.`,
    emailSubject: `[PlacementHub] Reminder: ${company} placement drive`,
    emailBody:
      `Reminder from your placement office:\n\n` +
      `${company} is conducting "${title}".\n` +
      `Drive date: ${dateLabel}\n\n` +
      `Sign in to PlacementHub → Browse Drives to check eligibility and apply.\n`,
    link: '/dashboard/student/drives',
  };
}
