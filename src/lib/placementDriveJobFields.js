/**
 * Campus job fields stored directly on placement_drives (formerly on linked job_postings).
 */

import {
  validateEmployerDriveDate,
  validateEmployerJobPayload,
  validateTitlePayload,
} from '@/lib/apiInputValidation';
import { validateFieldOrError, FIELD_IDS } from '@/lib/inputConstraints';
import { normalizeTitle, validateBatchYear } from '@/lib/validators';
import { normalizeEmployerMinCgpa, resolveEmployerMinCgpaForSubmit } from '@/lib/employerJobDisplay';
import {
  formatCommaList,
  formatEligibleBranchesLabel,
  parseCommaList,
  resolveBatchYearInput,
  resolveEligibleBranchesInput,
  resolveMaxBacklogsInput,
} from '@/lib/internshipPostingMeta';
import { formatSalaryRangeParts } from '@/lib/utils';

export const PLACEMENT_DRIVE_JOB_TYPES = new Set(['full_time', 'internship', 'contract', 'ppo']);

export const PLACEMENT_DRIVE_JOB_TYPE_LABELS = {
  full_time: 'Full-time',
  internship: 'Internship',
  contract: 'Contract',
  ppo: 'PPO',
};

/** SQL fragment appended to drive SELECT lists (after core columns). */
export const PLACEMENT_DRIVE_JOB_SELECT_SQL = `
        d.job_type,
        d.salary_min,
        d.salary_max,
        d.eligible_branches,
        d.max_backlogs,
        d.batch_year,
        d.skills_required,
        d.additional_info,
        d.application_deadline,
        d.min_tenth_pct,
        d.min_twelfth_pct,
        d.bond_duration_months,
        d.bond_penalty,
        d.locations,
        d.category,
        d.perks,
        d.max_students`;

export const emptyPlacementDriveForm = {
  title: '',
  driveType: 'on_campus',
  driveDate: '',
  venue: '',
  jobDescription: '',
  placementNotes: '',
  jobType: 'full_time',
  vacancies: '',
  salaryMin: '',
  salaryMax: '',
  minCgpa: '',
  eligibleBranches: '',
  maxBacklogs: '0',
  batchYear: '',
  minTenthPct: '',
  minTwelfthPct: '',
  skillsRequired: '',
  locations: '',
  additionalInfo: '',
  applicationDeadline: '',
  packageCtc: '',
  ctcBreakup: '',
};

function parseSkillsInput(raw) {
  const list = parseCommaList(raw);
  return list.length ? list : null;
}

function parseOptionalPercent(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return n;
}

function normalizeApplicationDeadline(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const trimmed = String(raw).trim();
  const iso = trimmed.length === 10 ? `${trimmed}T23:59:59` : trimmed.replace(' ', 'T');
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 19);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ error: string | null, value?: Record<string, unknown> }}
 */
export function parsePlacementDriveJobPayload(body = {}) {
  const jobType = String(body.jobType || body.job_type || 'full_time');
  if (!PLACEMENT_DRIVE_JOB_TYPES.has(jobType)) {
    return { error: 'Invalid job type for placement drive.' };
  }

  const minCgpaResolved = resolveEmployerMinCgpaForSubmit(body.minCgpa);
  if (minCgpaResolved.error) return { error: minCgpaResolved.error };

  const jobErr = validateEmployerJobPayload({
    salaryMin: body.salaryMin,
    salaryMax: body.salaryMax,
    minCgpa: body.minCgpa,
    vacancies: body.vacancies,
    jobType,
  });
  if (jobErr) return { error: jobErr };

  const salaryMin = body.salaryMin != null && body.salaryMin !== '' ? Number(body.salaryMin) : null;
  const salaryMax = body.salaryMax != null && body.salaryMax !== '' ? Number(body.salaryMax) : null;
  const vacanciesRaw = body.vacancies;
  const maxStudents =
    vacanciesRaw != null && vacanciesRaw !== ''
      ? Math.max(1, parseInt(String(vacanciesRaw), 10) || 1)
      : null;

  return {
    error: null,
    value: {
      jobType,
      salaryMin,
      salaryMax,
      minCgpa: minCgpaResolved.value,
      maxStudents,
      eligibleBranches: resolveEligibleBranchesInput(body.eligibleBranches),
      maxBacklogs: resolveMaxBacklogsInput(body.maxBacklogs),
      batchYear: resolveBatchYearInput(body.batchYear),
      skillsRequired: parseSkillsInput(body.skillsRequired ?? body.keywords),
      additionalInfo:
        body.additionalInfo != null && String(body.additionalInfo).trim().length > 0
          ? String(body.additionalInfo).trim().slice(0, 10000)
          : null,
      applicationDeadline: normalizeApplicationDeadline(body.applicationDeadline),
      minTenthPct: parseOptionalPercent(body.minTenthPct),
      minTwelfthPct: parseOptionalPercent(body.minTwelfthPct),
      locations: (() => {
        const list = parseCommaList(body.locations);
        return list.length ? list : null;
      })(),
    },
  };
}

/** @param {Record<string, unknown> | null | undefined} row */
export function mapDriveJobFieldsFromRow(row) {
  if (!row) return {};
  const branches = row.eligible_branches ?? row.eligibleBranches;
  return {
    jobType: row.job_type ?? row.jobType ?? 'full_time',
    job_type: row.job_type ?? row.jobType ?? 'full_time',
    salaryMin: row.salary_min != null ? Number(row.salary_min) : row.salaryMin ?? null,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : row.salaryMax ?? null,
    salary_min: row.salary_min ?? null,
    salary_max: row.salary_max ?? null,
    eligibleBranches: Array.isArray(branches) ? branches : null,
    eligible_branches: Array.isArray(branches) ? branches : null,
    maxBacklogs: row.max_backlogs != null ? Number(row.max_backlogs) : row.maxBacklogs ?? null,
    max_backlogs: row.max_backlogs ?? null,
    batchYear: row.batch_year != null ? Number(row.batch_year) : row.batchYear ?? null,
    batch_year: row.batch_year ?? null,
    skillsRequired: row.skills_required ?? row.skillsRequired ?? null,
    skills_required: row.skills_required ?? null,
    additionalInfo: row.additional_info ?? row.additionalInfo ?? null,
    additional_info: row.additional_info ?? null,
    applicationDeadline: row.application_deadline ?? row.applicationDeadline ?? null,
    application_deadline: row.application_deadline ?? null,
    minTenthPct: row.min_tenth_pct ?? row.minTenthPct ?? null,
    minTwelfthPct: row.min_twelfth_pct ?? row.minTwelfthPct ?? null,
    locations: row.locations ?? null,
    vacancies: row.max_students ?? row.vacancies ?? null,
    max_students: row.max_students ?? null,
  };
}

/** @param {Record<string, unknown>} row */
export function mapStudentDriveListRow(row) {
  const branches = row.eligible_branches;
  const branchList =
    Array.isArray(branches) && branches.length > 0 ? branches : ['All eligible branches'];
  const salaryParts = formatSalaryRangeParts(
    row.salary_min != null ? Number(row.salary_min) : null,
    row.salary_max != null ? Number(row.salary_max) : null,
  );
  return {
    id: row.id,
    company: row.company,
    website: row.website || null,
    role: row.role,
    date: row.date,
    type: row.type,
    venue: row.venue || 'TBD',
    description: row.description?.trim() || null,
    offCampusCity: null,
    salary: salaryParts.numeric,
    salaryWords: salaryParts.words,
    status: row.status,
    branch: branchList,
    cgpa: normalizeEmployerMinCgpa(row.min_cgpa ?? row.minCgpa),
    minCgpa: normalizeEmployerMinCgpa(row.min_cgpa ?? row.minCgpa),
    maxBacklogs: row.max_backlogs != null ? Number(row.max_backlogs) : null,
    batchYear: row.batch_year != null ? Number(row.batch_year) : null,
    eligibleBranches: Array.isArray(branches) && branches.length ? branches : null,
    applicationDeadline: row.application_deadline || null,
    jobType: row.job_type || 'full_time',
    skillsRequired: Array.isArray(row.skills_required) ? row.skills_required : [],
    additionalInfo: row.additional_info || null,
    vacancies: row.vacancies ?? row.max_students ?? 0,
    registered: row.registered ?? 0,
    deadline: row.application_deadline || null,
    applied: Boolean(row.applied),
    applicationStatus: row.application_status || null,
  };
}

/** @param {Record<string, unknown> | null | undefined} drive */
export function driveFormFromApiDrive(drive) {
  if (!drive) return { ...emptyPlacementDriveForm };
  const job = mapDriveJobFieldsFromRow(drive);
  return {
    title: drive.role || drive.title || '',
    driveType: drive.type || drive.drive_type || 'on_campus',
    driveDate: drive.date ? String(drive.date).slice(0, 10) : '',
    venue: drive.venue || '',
    jobDescription: drive.description || '',
    placementNotes: drive.notes || '',
    jobType: job.jobType || 'full_time',
    vacancies: job.vacancies != null ? String(job.vacancies) : '',
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
    minCgpa: (() => {
      const n = normalizeEmployerMinCgpa(drive.min_cgpa ?? drive.minCgpa);
      return n != null ? String(n) : '';
    })(),
    eligibleBranches: formatCommaList(job.eligibleBranches),
    maxBacklogs: job.maxBacklogs != null ? String(job.maxBacklogs) : '0',
    batchYear: job.batchYear != null ? String(job.batchYear) : '',
    minTenthPct: job.minTenthPct != null ? String(job.minTenthPct) : '',
    minTwelfthPct: job.minTwelfthPct != null ? String(job.minTwelfthPct) : '',
    skillsRequired: formatCommaList(job.skillsRequired),
    locations: formatCommaList(job.locations),
    additionalInfo: job.additionalInfo || '',
    applicationDeadline: job.applicationDeadline
      ? String(job.applicationDeadline).slice(0, 16)
      : '',
    packageCtc: '',
    ctcBreakup: drive.ctc_breakup || '',
  };
}

/** Build API payload from form state (before ctcBreakup merge). */
export function placementDriveFormToApiBody(form, { ctcBreakup } = {}) {
  return {
    title: normalizeTitle(form.title),
    description: form.jobDescription,
    notes: form.placementNotes,
    driveType: form.driveType,
    driveDate: form.driveDate || null,
    venue: form.venue,
    jobType: form.jobType,
    vacancies: form.vacancies,
    salaryMin: form.salaryMin,
    salaryMax: form.salaryMax,
    minCgpa: form.minCgpa,
    eligibleBranches: form.eligibleBranches,
    maxBacklogs: form.maxBacklogs,
    batchYear: form.batchYear,
    minTenthPct: form.minTenthPct,
    minTwelfthPct: form.minTwelfthPct,
    skillsRequired: form.skillsRequired,
    locations: form.locations,
    additionalInfo: form.additionalInfo,
    applicationDeadline: form.applicationDeadline || null,
    ctcBreakup,
  };
}

/** Map a single validation/API error string to a form field key when possible. */
export function mapPlacementDriveErrorToField(error) {
  const msg = String(error || '').trim();
  if (!msg) return null;
  const lower = msg.toLowerCase();
  if (lower.includes('drive title') || lower.includes('title is required') || lower.includes('title must')) {
    return { field: 'title', message: msg };
  }
  if (lower.includes('drive date')) return { field: 'driveDate', message: msg };
  if (lower.includes('maximum salary') || lower.includes('maximum stipend')) {
    return { field: 'salaryMax', message: msg };
  }
  if (lower.includes('minimum salary') || lower.includes('minimum stipend')) {
    return { field: 'salaryMin', message: msg };
  }
  if (lower.includes('cgpa')) return { field: 'minCgpa', message: msg };
  if (lower.includes('vacanc') || lower.includes('opening')) return { field: 'vacancies', message: msg };
  if (lower.includes('batch year')) return { field: 'batchYear', message: msg };
  if (lower.includes('10th') || lower.includes('class x')) return { field: 'minTenthPct', message: msg };
  if (lower.includes('12th') || lower.includes('class xii')) return { field: 'minTwelfthPct', message: msg };
  if (lower.includes('deadline') || lower.includes('application date')) {
    return { field: 'applicationDeadline', message: msg };
  }
  if (lower.includes('backlog')) return { field: 'maxBacklogs', message: msg };
  if (lower.includes('job type')) return { field: 'jobType', message: msg };
  return null;
}

/**
 * Client-side validation for placement drive request/edit forms.
 * @returns {Record<string, string>} field key → error message (may include `_form`)
 */
export function validatePlacementDriveForm(form) {
  const fieldErrors = {};

  const titleErr = validateTitlePayload(form.title, { label: 'Drive title' });
  if (titleErr) fieldErrors.title = titleErr;

  const driveDateErr = validateEmployerDriveDate(form.driveDate);
  if (driveDateErr) fieldErrors.driveDate = driveDateErr;

  const batchErr = validateBatchYear(form.batchYear, { required: false });
  if (batchErr) fieldErrors.batchYear = batchErr;

  const backlogErr = validateFieldOrError(
    FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS,
    form.maxBacklogs === '' || form.maxBacklogs == null ? '0' : form.maxBacklogs,
    { label: 'Max active backlogs' },
  );
  if (backlogErr) fieldErrors.maxBacklogs = backlogErr;

  if (form.minTenthPct !== '' && form.minTenthPct != null) {
    const pctErr = validateFieldOrError(FIELD_IDS.STUDENT_PERCENT, form.minTenthPct, { label: 'Min 10th %' });
    if (pctErr) fieldErrors.minTenthPct = pctErr;
  }

  if (form.minTwelfthPct !== '' && form.minTwelfthPct != null) {
    const pctErr = validateFieldOrError(FIELD_IDS.STUDENT_PERCENT, form.minTwelfthPct, { label: 'Min 12th %' });
    if (pctErr) fieldErrors.minTwelfthPct = pctErr;
  }

  if (form.applicationDeadline != null && String(form.applicationDeadline).trim() !== '') {
    const normalized = normalizeApplicationDeadline(form.applicationDeadline);
    if (!normalized) {
      fieldErrors.applicationDeadline = 'Enter a complete application deadline (DD / MM / YYYY).';
    } else {
      const deadlineErr = validateFieldOrError(FIELD_IDS.EMPLOYER_DRIVE_DATE, normalized.slice(0, 10), {
        label: 'Application deadline',
      });
      if (deadlineErr) fieldErrors.applicationDeadline = deadlineErr;
    }
  }

  const apiBody = placementDriveFormToApiBody(form, { ctcBreakup: '' });
  const jobParsed = parsePlacementDriveJobPayload(apiBody);
  if (jobParsed.error) {
    const mapped = mapPlacementDriveErrorToField(jobParsed.error);
    if (mapped && !fieldErrors[mapped.field]) {
      fieldErrors[mapped.field] = mapped.message;
    } else if (!mapped) {
      fieldErrors._form = jobParsed.error;
    }
  }

  const jobErr = validateEmployerJobPayload({
    salaryMin: form.salaryMin,
    salaryMax: form.salaryMax,
    minCgpa: form.minCgpa,
    vacancies: form.vacancies,
    jobType: form.jobType,
  });
  if (jobErr) {
    const mapped = mapPlacementDriveErrorToField(jobErr);
    if (mapped && !fieldErrors[mapped.field]) {
      fieldErrors[mapped.field] = mapped.message;
    } else if (!fieldErrors._form) {
      fieldErrors._form = jobErr;
    }
  }

  return fieldErrors;
}

/** Turn an API error string into field errors for inline display. */
export function mapDriveApiErrorToFieldErrors(error) {
  const mapped = mapPlacementDriveErrorToField(error);
  if (mapped) return { [mapped.field]: mapped.message };
  return { _form: String(error || 'Save failed').trim() };
}

/** @param {Record<string, unknown> | null | undefined} row */
export function driveEligibilityOpportunity(row) {
  if (!row) return { status: 'approved' };
  const branches = row.eligible_branches ?? row.eligibleBranches;
  return {
    minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : row.minCgpa ?? null,
    maxBacklogs: row.max_backlogs != null ? Number(row.max_backlogs) : row.maxBacklogs ?? null,
    eligibleBranches: Array.isArray(branches) && branches.length ? branches : null,
    batchYear: row.batch_year != null ? Number(row.batch_year) : row.batchYear ?? null,
    applicationDeadline: row.application_deadline ?? row.applicationDeadline ?? null,
    status: row.drive_status ?? row.status ?? 'approved',
  };
}

export { formatEligibleBranchesLabel };
