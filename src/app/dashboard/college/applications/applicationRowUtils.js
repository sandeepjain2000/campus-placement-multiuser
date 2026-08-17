import { formatStatus, getStatusColor } from '@/lib/utils';

export function openingLabel(a) {
  return a?.opening_title || a?.drive_title || '—';
}

export function applicationKindLabel(a) {
  if (a?.source_kind === 'drive') return 'Placement drive';
  const jt = String(a?.job_type || '').toLowerCase();
  if (jt === 'internship') return 'Internship';
  if (jt === 'short_project' || jt === 'hackathon') return 'Project';
  if (jt === 'full_time' || jt === 'part_time' || jt === 'contract') return 'Job';
  return 'Program';
}

export function getApplicationKindMeta(a) {
  if (a?.source_kind === 'drive') return { label: 'Placement drive', tone: 'indigo' };
  const jt = String(a?.job_type || '').toLowerCase();
  if (jt === 'internship') return { label: 'Internship', tone: 'indigo' };
  if (jt === 'short_project' || jt === 'hackathon') return { label: 'Project', tone: 'amber' };
  if (jt === 'full_time' || jt === 'part_time' || jt === 'contract') return { label: 'Job', tone: 'blue' };
  return { label: 'Program', tone: 'gray' };
}

export function getApplicationStatusMeta(status) {
  const tone = getStatusColor(status);
  const label = formatStatus(status) || 'Applied';
  return { label, tone };
}

export function computeApplicationStats(applications, counts = {}) {
  const list = Array.isArray(applications) ? applications : [];
  const statusCounts = {};
  list.forEach((a) => {
    const key = String(a.status || 'applied').toLowerCase();
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });
  return {
    total: counts.total ?? list.length,
    drives: counts.drives ?? 0,
    programs: counts.programs ?? 0,
    statusCounts,
  };
}

export function studentInitials(name) {
  return (name || 'S')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
