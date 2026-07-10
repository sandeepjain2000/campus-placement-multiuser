import { formatCurrency } from '@/lib/utils';
import { ALUMNI_EMPLOYMENT_TYPE_LABELS } from '@/lib/alumniJobPosting';
import { getCollegeStatusMeta } from '../internships/internshipRowUtils';

export { getCollegeStatusMeta };

export function salaryLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null && Number(min) === Number(max)) {
    return `${formatCurrency(Number(min))}/yr`;
  }
  if (min != null && max != null) {
    return `${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}/yr`;
  }
  if (min != null) return `From ${formatCurrency(Number(min))}/yr`;
  return `Up to ${formatCurrency(Number(max))}/yr`;
}

export function getAlumniJobTypeMeta(jobType) {
  const label = ALUMNI_EMPLOYMENT_TYPE_LABELS[jobType] || String(jobType || 'job').replace(/_/g, ' ');
  return { label, badge: 'badge-indigo' };
}

export function computeAlumniJobStats(list) {
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
    avgSalary: count ? Math.round(sum / count) : null,
    openings: list.reduce((s, r) => s + (parseInt(r.vacancies, 10) || 0), 0),
  };
}
