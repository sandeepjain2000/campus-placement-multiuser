/** Super-admin cross-platform listing labels and filters. */

/** SQL expression: tenant name with city/state when available (disambiguates e.g. "bits" vs BITS Pilani). */
export const CAMPUS_DISPLAY_NAME_SQL = `trim(both from t.name ||
  CASE
    WHEN nullif(trim(t.city), '') IS NOT NULL AND nullif(trim(t.state), '') IS NOT NULL
      THEN ' (' || trim(t.city) || ', ' || trim(t.state) || ')'
    WHEN nullif(trim(t.city), '') IS NOT NULL THEN ' (' || trim(t.city) || ')'
    WHEN nullif(trim(t.state), '') IS NOT NULL THEN ' (' || trim(t.state) || ')'
    ELSE ''
  END)`;

export const ADMIN_LISTING_TAB_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'job', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'drive', label: 'Placement drives' },
  { value: 'project', label: 'Projects' },
  { value: 'hackathon', label: 'Hackathons' },
];

const JOB_TYPES = new Set(['full_time', 'contract', 'ppo', 'part_time']);

export function listingCategoryFromJobType(jobType) {
  const t = String(jobType || '').trim();
  if (t === 'internship') return 'internship';
  if (t === 'short_project') return 'project';
  if (t === 'hackathon') return 'hackathon';
  if (JOB_TYPES.has(t)) return 'job';
  return 'other';
}

export function listingTypeLabel(listing) {
  if (listing.source === 'drive') return 'Placement drive';
  const labels = {
    full_time: 'Full-time job',
    contract: 'Contract',
    ppo: 'PPO',
    part_time: 'Part-time',
    internship: 'Internship',
    short_project: 'Project',
    hackathon: 'Hackathon',
    mentorship: 'Mentorship',
    guest_faculty: 'Guest faculty',
  };
  return labels[listing.jobType] || listing.jobType || 'Posting';
}

export function matchesListingTab(listing, tab) {
  if (!tab) return true;
  if (tab === 'drive') return listing.source === 'drive';
  return listing.source === 'posting' && listing.category === tab;
}

export function mapJobPostingRow(r) {
  const category = listingCategoryFromJobType(r.job_type);
  return {
    id: r.id,
    source: 'posting',
    category,
    jobType: r.job_type,
    typeLabel: listingTypeLabel({ source: 'posting', jobType: r.job_type }),
    title: r.title,
    status: r.status,
    employerId: r.employer_id,
    employerName: r.company_name || '—',
    collegeNames: r.campus_names || '—',
    campusCount: Number(r.campus_count ?? 0),
    applicationCount: Number(r.application_count ?? 0),
    vacancies: r.vacancies != null ? Number(r.vacancies) : null,
    salaryMin: r.salary_min != null ? Number(r.salary_min) : null,
    salaryMax: r.salary_max != null ? Number(r.salary_max) : null,
    eventDate: r.application_deadline ? new Date(r.application_deadline).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  };
}

export function mapDriveRow(r) {
  return {
    id: r.id,
    source: 'drive',
    category: 'drive',
    jobType: null,
    typeLabel: 'Placement drive',
    title: r.title,
    status: r.status,
    employerId: r.employer_id,
    employerName: r.company_name || '—',
    collegeNames: r.college_name || '—',
    collegeId: r.college_id || null,
    campusCount: r.college_name ? 1 : 0,
    applicationCount: Number(r.registered_count ?? 0),
    vacancies: r.max_students != null ? Number(r.max_students) : null,
    salaryMin: null,
    salaryMax: null,
    eventDate: r.drive_date ? new Date(r.drive_date).toISOString().slice(0, 10) : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    driveType: r.drive_type || null,
  };
}
