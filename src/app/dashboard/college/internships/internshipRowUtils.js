import { formatCurrency } from '@/lib/utils';

export function stipendLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null && Number(min) === Number(max)) {
    return `${formatCurrency(Number(min))}/mo`;
  }
  if (min != null && max != null) {
    return `${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}/mo`;
  }
  if (min != null) return `${formatCurrency(Number(min))}/mo`;
  return `${formatCurrency(Number(max))}/mo`;
}

export function getJobTypeMeta(jobType) {
  if (jobType === 'hackathon') {
    return { label: 'Hackathon', badge: 'badge-amber' };
  }
  if (jobType === 'short_project') {
    return { label: 'Short project', badge: 'badge-amber' };
  }
  return { label: 'Internship', badge: 'badge-indigo' };
}

export function getCollegeStatusMeta(status) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'approved') return { label: 'Approved', badge: 'badge-success' };
  if (s === 'rejected') return { label: 'Rejected', badge: 'badge-danger' };
  return { label: 'Pending review', badge: 'badge-warning' };
}

export function computeInternshipStats(list) {
  let sum = 0;
  let count = 0;
  let pending = 0;
  list.forEach((row) => {
    if (String(row.college_status || 'pending') === 'pending') pending += 1;
    const a = row.salary_min != null ? Number(row.salary_min) : null;
    const b = row.salary_max != null ? Number(row.salary_max) : null;
    if (a != null && b != null) {
      sum += (a + b) / 2;
      count += 1;
    } else if (a != null) {
      sum += a;
      count += 1;
    } else if (b != null) {
      sum += b;
      count += 1;
    }
  });
  return {
    count: list.length,
    pending,
    avgStipend: count ? Math.round(sum / count) : null,
    openings: list.reduce((s, r) => s + (parseInt(r.vacancies, 10) || 0), 0),
  };
}
