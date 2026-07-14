import { SORT_DATE_ASC, SORT_DATE_DESC, SORT_NAME_ASC, SORT_NAME_DESC } from '@/lib/dataTableQuery';

export const FILTER_ALL = { value: '', label: 'All' };

export const STATUS_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const ROLE_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'super_admin', label: 'Super admin' },
  { value: 'college_admin', label: 'College admin' },
  { value: 'employer', label: 'Employer' },
  { value: 'student', label: 'Student' },
];

export const COMMON_SORT_OPTIONS = [SORT_NAME_ASC, SORT_NAME_DESC, SORT_DATE_DESC, SORT_DATE_ASC];

export const COMPANY_SORT_OPTIONS = [
  {
    value: 'company_asc',
    label: 'Company (A → Z)',
    compare: (a, b) =>
      String(a?.companyName ?? a?.company ?? '').localeCompare(
        String(b?.companyName ?? b?.company ?? ''),
        undefined,
        { sensitivity: 'base' },
      ),
  },
  {
    value: 'company_desc',
    label: 'Company (Z → A)',
    compare: (a, b) =>
      String(b?.companyName ?? b?.company ?? '').localeCompare(
        String(a?.companyName ?? a?.company ?? ''),
        undefined,
        { sensitivity: 'base' },
      ),
  },
  {
    value: 'role_asc',
    label: 'Role (A → Z)',
    compare: (a, b) =>
      String(a?.title ?? a?.role ?? '').localeCompare(String(b?.title ?? b?.role ?? ''), undefined, {
        sensitivity: 'base',
      }),
  },
  SORT_DATE_DESC,
  SORT_DATE_ASC,
];

export const STUDENT_OPPORTUNITY_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'open', label: 'Open' },
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function opportunityFilterFn(row, filter) {
  if (!filter) return true;
  if (filter === 'open') return !row.hasApplied;
  const st = String(row.applicationStatus || '').toLowerCase();
  return st === filter;
}

export function opportunitySearchText(row) {
  return [row.companyName, row.title, row.applicationStatus].filter(Boolean).join(' ');
}

export function applicationSearchText(row) {
  return [row.company, row.companyName, row.role, row.title, row.status].filter(Boolean).join(' ');
}

export function statusActiveFilterFn(row, filter) {
  if (!filter) return true;
  if (filter === 'active') return row.active !== false;
  if (filter === 'inactive') return row.active === false;
  return true;
}

export const EMPLOYER_STATUS_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revoked', label: 'Revoked' },
];

export function employerStatusFilterFn(row, filter) {
  if (!filter) return true;
  const status = String(row.status || '').toLowerCase();
  if (filter === 'revoked') return status === 'revoked' || status === 'blacklisted';
  return status === filter;
}

export const EMPLOYER_VERIFIED_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' },
];

export function employerVerifiedFilterFn(row, filter) {
  if (!filter) return true;
  if (filter === 'blocked') return Boolean(row.blacklisted);
  if (filter === 'verified') return Boolean(row.verified) && !row.blacklisted;
  if (filter === 'pending') return !row.verified && !row.blacklisted;
  return true;
}

export function roleFilterFn(row, filter) {
  if (!filter) return true;
  return String(row.role || '') === filter;
}

export const PENDING_ROLE_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'college_admin', label: 'College' },
  { value: 'employer', label: 'Employer' },
];

export const FEEDBACK_STATUS_FILTER_OPTIONS = [
  FILTER_ALL,
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Under Review', label: 'Under review' },
  { value: 'Planned', label: 'Planned' },
  { value: 'Closed', label: 'Closed' },
];

export function feedbackStatusFilterFn(row, filter) {
  if (!filter) return true;
  return String(row.status || '') === filter;
}
