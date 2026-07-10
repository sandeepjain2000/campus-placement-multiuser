export function normalizeAppStatus(status) {
  return String(status || '').toLowerCase().trim();
}

/**
 * Student-facing pipeline stage for an application row.
 * Terminal statuses (withdrawn, selected, rejected) take precedence over round hints.
 */
export function studentApplicationStageLabel(item) {
  const status = normalizeAppStatus(item?.status ?? item?.applicationStatus);
  if (status === 'withdrawn') return 'Withdrawn';
  if (status === 'selected') return 'Selected — formal offer pending';
  if (status === 'rejected') return 'Not qualified';
  if (status === 'on_hold') return 'On waitlist';
  if (status === 'in_progress') return 'Interview in progress';

  const round = Number(item?.currentRound ?? item?.current_round);
  if (round > 0) return `Round ${round}`;
  if (status === 'shortlisted') return 'Shortlisted';
  if (status === 'applied') return 'Pending review';
  return status ? status.replace(/_/g, ' ') : 'Pending review';
}

/**
 * Tab counts for student application lists.
 * "Applied" is cumulative — every submission counts, regardless of current stage.
 * Stage tabs (shortlisted, selected, etc.) count only rows in that status.
 */
export function applicationStatusCounts(applications) {
  const list = Array.isArray(applications) ? applications : [];
  const counts = {
    all: list.length,
    applied: list.length,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
  };
  for (const app of list) {
    const key = normalizeAppStatus(app.status);
    if (key !== 'applied' && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
  }
  return counts;
}

/** @param {string} statusTab empty = all; "applied" = all submissions; else match status */
export function filterApplicationsByStatusTab(applications, statusTab) {
  const list = Array.isArray(applications) ? applications : [];
  if (!statusTab) return list;
  if (statusTab === 'applied') return list;
  return list.filter((a) => normalizeAppStatus(a.status) === statusTab);
}
