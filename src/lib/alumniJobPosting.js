/**
 * Alumni / lateral job postings (experienced hire — Naukri / Monster style).
 */

import { validateSalaryPair, FIELD_IDS } from '@/lib/inputConstraints';
import { ALUMNI_JOB_TYPES } from '@/lib/studentAlumni';

export { ALUMNI_JOB_TYPES };

export const EMPLOYER_PROGRAM_JOB_TYPES = ['internship', 'short_project', 'hackathon'];

export const ALUMNI_EMPLOYMENT_TYPE_LABELS = {
  full_time: 'Full-time',
  contract: 'Contract',
};

export const ALUMNI_WORK_MODES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const ALUMNI_SENIORITY_LEVELS = [
  { value: 'associate', label: 'Associate (0–2 yrs)' },
  { value: 'mid', label: 'Mid-level (2–5 yrs)' },
  { value: 'senior', label: 'Senior (5–8 yrs)' },
  { value: 'lead', label: 'Lead / Principal (8+ yrs)' },
  { value: 'manager', label: 'Manager / Director' },
];

export const ALUMNI_EDUCATION_LEVELS = [
  { value: 'any', label: 'Any graduate' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'mba', label: 'MBA' },
  { value: 'phd', label: 'PhD / Doctorate' },
];

const WORK_MODE_LABELS = Object.fromEntries(ALUMNI_WORK_MODES.map((o) => [o.value, o.label]));
const SENIORITY_LABELS = Object.fromEntries(ALUMNI_SENIORITY_LEVELS.map((o) => [o.value, o.label]));
const EDUCATION_LABELS = Object.fromEntries(ALUMNI_EDUCATION_LEVELS.map((o) => [o.value, o.label]));

export function isAlumniEmploymentType(jobType) {
  return ALUMNI_JOB_TYPES.includes(String(jobType || '').trim());
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {{ types: string[] | null }}
 */
export function resolveEmployerJobsListFilter(searchParams) {
  const jobType = searchParams.get('jobType');
  const scope = searchParams.get('scope');

  if (jobType && ALL_EMPLOYER_LISTABLE_TYPES.has(jobType)) {
    return { types: [jobType] };
  }
  if (scope === 'programs') {
    return { types: ['short_project', 'hackathon'] };
  }
  if (scope === 'all') {
    return { types: null };
  }
  return { types: [...ALUMNI_JOB_TYPES] };
}

const ALL_EMPLOYER_LISTABLE_TYPES = new Set([
  ...ALUMNI_JOB_TYPES,
  ...EMPLOYER_PROGRAM_JOB_TYPES,
  'ppo',
  'mentorship',
  'guest_faculty',
]);

export function formatExperienceRange(min, max) {
  const lo = min != null && min !== '' ? Number(min) : null;
  const hi = max != null && max !== '' ? Number(max) : null;
  if (lo != null && !Number.isNaN(lo) && hi != null && !Number.isNaN(hi)) {
    return lo === hi ? `${lo} yr${lo === 1 ? '' : 's'}` : `${lo}–${hi} yrs`;
  }
  if (lo != null && !Number.isNaN(lo)) return `${lo}+ yrs`;
  if (hi != null && !Number.isNaN(hi)) return `Up to ${hi} yrs`;
  return '—';
}

export function formatAlumniJobLocation(locations) {
  if (!Array.isArray(locations) || !locations.length) return '—';
  return locations.filter(Boolean).join(', ');
}

/**
 * @param {object} fields
 */
export function buildAlumniJobDescription(fields) {
  const typeLabel = ALUMNI_EMPLOYMENT_TYPE_LABELS[fields.type] || fields.type || 'Full-time';
  const kw = String(fields.keywords || '')
    .split(/[,;]/)
    .map((k) => k.trim())
    .filter(Boolean);
  const exp = formatExperienceRange(fields.minExperience, fields.maxExperience);
  const workMode = WORK_MODE_LABELS[fields.workMode] || fields.workMode || 'Not specified';
  const seniority = SENIORITY_LABELS[fields.seniorityLevel] || fields.seniorityLevel || 'Not specified';
  const education = EDUCATION_LABELS[fields.educationLevel] || fields.educationLevel || 'Any graduate';
  const location = String(fields.location || '').trim() || 'To be discussed';
  const notice =
    fields.noticePeriodDays != null && fields.noticePeriodDays !== ''
      ? `${fields.noticePeriodDays} days`
      : 'Flexible / negotiable';

  const sm = fields.salaryMin === '' || fields.salaryMin == null ? null : Number(fields.salaryMin);
  const sx = fields.salaryMax === '' || fields.salaryMax == null ? null : Number(fields.salaryMax);
  const compensation =
    sm != null && !Number.isNaN(sm) && sx != null && !Number.isNaN(sx)
      ? `Annual CTC: ₹${sm.toLocaleString('en-IN')} – ₹${sx.toLocaleString('en-IN')} (components per company policy).`
      : 'Compensation band to be discussed with shortlisted candidates.';

  const role =
    fields.title?.trim()
      ? `We are hiring an experienced ${fields.title.trim()} (${typeLabel}) for our alumni network. You will contribute across delivery, stakeholder collaboration, and mentoring where relevant.`
      : 'Enter a job title to generate the role summary.';

  const experience = `Required experience: ${exp}. Seniority band: ${seniority}.`;

  const skills =
    kw.length > 0
      ? `Key skills: ${kw.join(', ')}. Prior industry experience in these areas is expected.`
      : 'Add comma-separated key skills (e.g. Java, AWS, people management).';

  const logistics = `Work mode: ${workMode}. Primary location: ${location}. Notice period: ${notice}.`;

  const qualifications = `Education: ${education}. This is a lateral / experienced-hire role for alumni — campus CGPA and batch cut-offs do not apply.`;

  return [
    '— Alumni job description (auto-generated; edit freely) —',
    '',
    'ROLE',
    role,
    '',
    'EXPERIENCE',
    experience,
    '',
    'SKILLS',
    skills,
    '',
    'QUALIFICATIONS',
    qualifications,
    '',
    'COMPENSATION',
    compensation,
    '',
    'WORK ARRANGEMENT',
    logistics,
  ].join('\n');
}

/**
 * @param {object} fields
 * @returns {{ error: string | null }}
 */
export function validateAlumniJobPostingPayload(fields) {
  const salaryErr = validateSalaryPair(
    fields.salaryMin,
    fields.salaryMax,
    FIELD_IDS.EMPLOYER_SALARY_MIN,
    FIELD_IDS.EMPLOYER_SALARY_MAX,
  );
  if (salaryErr) return { error: salaryErr };

  const minExp =
    fields.minExperience != null && fields.minExperience !== '' ? Number(fields.minExperience) : null;
  const maxExp =
    fields.maxExperience != null && fields.maxExperience !== '' ? Number(fields.maxExperience) : null;

  if (minExp != null && (Number.isNaN(minExp) || minExp < 0 || minExp > 40)) {
    return { error: 'Minimum experience must be between 0 and 40 years.' };
  }
  if (maxExp != null && (Number.isNaN(maxExp) || maxExp < 0 || maxExp > 40)) {
    return { error: 'Maximum experience must be between 0 and 40 years.' };
  }
  if (minExp != null && maxExp != null && minExp > maxExp) {
    return { error: 'Minimum experience cannot exceed maximum experience.' };
  }

  if (!isAlumniEmploymentType(fields.jobType)) {
    return { error: 'Only full-time and contract roles can be posted as alumni jobs.' };
  }

  const notice =
    fields.noticePeriodDays != null && fields.noticePeriodDays !== ''
      ? Number(fields.noticePeriodDays)
      : null;
  if (notice != null && (Number.isNaN(notice) || notice < 0 || notice > 180)) {
    return { error: 'Notice period must be between 0 and 180 days.' };
  }

  return { error: null };
}

export function mapAlumniJobApiRow(row) {
  const locations = Array.isArray(row.locations) ? row.locations.filter(Boolean) : [];
  return {
    minExperience: row.min_experience_years,
    maxExperience: row.max_experience_years,
    workMode: row.work_mode || '',
    noticePeriodDays: row.notice_period_days,
    seniorityLevel: row.seniority_level || '',
    educationLevel: row.education_level || 'any',
    location: locations[0] || '',
    locations,
    industry: row.category || '',
    experienceLabel: formatExperienceRange(row.min_experience_years, row.max_experience_years),
    workModeLabel: WORK_MODE_LABELS[row.work_mode] || row.work_mode || '',
  };
}
