/**
 * Central numeric/date constraints for forms and APIs.
 * Decisions: percentages > 0 when set; backlogs allow 0; capacity empty or >= 1;
 * drive filters allow past dates; DOB age 17–35; buffer days / max backlogs allow 0.
 */

import {
  MIN_PLACEMENT_YEAR,
  parseYmdToLocalDate,
  startOfTodayLocal,
  toDateOnlyString,
  validateOfferDates,
  validatePlacementDate,
} from '@/lib/dateOnly';
import { validateInternshipBatchYearField } from '@/lib/internshipPostingMeta';
import { MAX_TITLE_LENGTH, validateEducationBoard, validateTitle } from '@/lib/validators';
import { formatValidationError } from '@/lib/validationErrorCode';

const NOW_YEAR = new Date().getFullYear();

export const FIELD_IDS = {
  STUDENT_CGPA: 'student.cgpa',
  STUDENT_PERCENT: 'student.percent',
  STUDENT_BATCH_YEAR: 'student.batchYear',
  STUDENT_GRAD_YEAR: 'student.graduationYear',
  STUDENT_BACKLOGS_ACTIVE: 'student.backlogsActive',
  STUDENT_BACKLOGS_TOTAL: 'student.backlogsTotal',
  STUDENT_PASSING_YEAR: 'student.passingYear',
  STUDENT_SALARY_MIN: 'student.salaryMin',
  STUDENT_SALARY_MAX: 'student.salaryMax',
  STUDENT_DOB: 'student.dateOfBirth',

  COLLEGE_OFFER_SALARY: 'college.offer.salary',
  COLLEGE_OFFER_DEADLINE: 'college.offer.deadline',
  COLLEGE_OFFER_JOINING: 'college.offer.joining',
  COLLEGE_INTERVIEW_DATE: 'college.interview.date',
  COLLEGE_INFRA_DATE: 'college.infrastructure.date',
  COLLEGE_FACILITY_CAPACITY: 'college.facility.capacity',
  COLLEGE_RULE_MAX_OFFERS: 'college.rule.maxOffers',
  COLLEGE_RULE_ACCEPT_WINDOW: 'college.rule.acceptanceWindow',
  COLLEGE_RULE_MIN_CGPA: 'college.rule.minCgpa',
  COLLEGE_RULE_MAX_BACKLOGS: 'college.rule.maxBacklogs',
  COLLEGE_RULE_BUFFER_DAYS: 'college.rule.bufferDays',
  COLLEGE_RULE_DREAM_MULT: 'college.rule.dreamMultiplier',
  COLLEGE_RULE_SEASON_START: 'college.rule.seasonStart',
  COLLEGE_RULE_SEASON_END: 'college.rule.seasonEnd',
  COLLEGE_NIRF_RANK: 'college.nirfRank',
  COLLEGE_PATENT_COUNT: 'college.patentCount',
  COLLEGE_STARTUP_COUNT: 'college.startupCount',
  COLLEGE_ACAD_YEAR_SEQ: 'college.academicYear.sequence',
  COLLEGE_ACAD_PERIOD_START: 'college.academicYear.periodStart',
  COLLEGE_ACAD_PERIOD_END: 'college.academicYear.periodEnd',

  EMPLOYER_SALARY_MIN: 'employer.salaryMin',
  EMPLOYER_SALARY_MAX: 'employer.salaryMax',
  EMPLOYER_STIPEND_MIN: 'employer.stipendMin',
  EMPLOYER_STIPEND_MAX: 'employer.stipendMax',
  EMPLOYER_VACANCIES: 'employer.vacancies',
  EMPLOYER_MIN_EXPERIENCE: 'employer.minExperience',
  EMPLOYER_MAX_EXPERIENCE: 'employer.maxExperience',
  EMPLOYER_NOTICE_PERIOD: 'employer.noticePeriodDays',
  EMPLOYER_MIN_CGPA: 'employer.minCgpa',
  EMPLOYER_DRIVE_DATE: 'employer.drive.date',
  EMPLOYER_INTERVIEW_DATE: 'employer.interview.date',
  EMPLOYER_INTERVIEW_ASSIGNED: 'employer.interview.assigned',
  EMPLOYER_INTERNSHIP_BATCH_YEAR: 'employer.internship.batchYear',
  EMPLOYER_FOUNDED_YEAR: 'employer.foundedYear',
  EMPLOYER_OFFER_SALARY: 'employer.offer.salary',
  EMPLOYER_OFFER_DEADLINE: 'employer.offer.deadline',
  EMPLOYER_OFFER_JOINING: 'employer.offer.joining',

  ADMIN_NIRF_RANK: 'admin.nirfRank',
  ADMIN_SESSION_TIMEOUT: 'admin.sessionTimeout',
  ADMIN_SMTP_PORT: 'admin.smtpPort',
  ADMIN_MAX_UPLOAD_MB: 'admin.maxUploadMb',

  DATE_RANGE_FROM: 'common.dateRangeFrom',
  DATE_RANGE_TO: 'common.dateRangeTo',
  DATE_FUTURE: 'common.dateFuture',
  DATE_ANY: 'common.dateAny',
  COMMON_TITLE: 'common.title',
  PROJECT_START: 'common.projectStart',
  PROJECT_END: 'common.projectEnd',

  DRIVE_MAX_STUDENTS: 'drive.maxStudents',

  EDUCATION_BOARD: 'student.educationBoard',
};

const SALARY_MAX = 200_000_000;
const SALARY_WARN = 10_000_000;
const STIPEND_MAX = 500_000;
const STIPEND_WARN = 200_000;

function parseNum(value) {
  if (value === '' || value == null) return { empty: true, n: NaN };
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return { empty: false, n };
}

function err(msg) {
  return { ok: false, error: msg, warn: null };
}
function ok(warn = null) {
  return { ok: true, error: null, warn };
}

function checkIntRange(value, { min, max, allowZero = false, allowEmpty = false, label }) {
  const { empty, n } = parseNum(value);
  if (empty) return allowEmpty ? ok() : err(`${label} is required.`);
  if (!Number.isFinite(n)) return err(`${label} must be a number.`);
  if (n < 0) return err(`${label} cannot be negative.`);
  if (!allowZero && n === 0) return err(`${label} must be greater than 0.`);
  if (n < min || n > max) return err(`${label} must be between ${min} and ${max}.`);
  return ok();
}

function checkCgpa(value, { required = false, label = 'CGPA' } = {}) {
  const { empty, n } = parseNum(value);
  if (empty) return required ? err(`${label} is required.`) : ok();
  if (!Number.isFinite(n) || n <= 0 || n > 10) return err(`${label} must be greater than 0 and at most 10.`);
  return ok();
}

function checkPercent(value, { required = false, label = 'Percentage' } = {}) {
  const { empty, n } = parseNum(value);
  if (empty) return required ? err(`${label} is required.`) : ok();
  if (!Number.isFinite(n) || n <= 0 || n > 100) return err(`${label} must be greater than 0 and at most 100.`);
  return ok();
}

const ALUMNI_YEAR_MIN = 1990;

function batchYearBounds({ isAlumni = false } = {}) {
  if (isAlumni) {
    return { min: ALUMNI_YEAR_MIN, max: NOW_YEAR - 1 };
  }
  return { min: NOW_YEAR - 12, max: NOW_YEAR + 8 };
}

function gradYearBounds({ isAlumni = false } = {}) {
  if (isAlumni) {
    return { min: ALUMNI_YEAR_MIN, max: NOW_YEAR - 1 };
  }
  return { min: NOW_YEAR - 1, max: NOW_YEAR + 8 };
}

function checkBatchYear(value, { required = false, isAlumni = false } = {}) {
  const { min, max } = batchYearBounds({ isAlumni });
  return checkIntRange(value, { min, max, allowEmpty: !required, label: 'Batch / admission year' });
}

function checkInternshipBatchYear(value, { required = false, date } = {}) {
  const r = validateInternshipBatchYearField(value, { required, date });
  if (r.formError) return err(r.formError);
  return ok();
}

function checkGradYear(value, { batchYear, required = false, isAlumni = false } = {}) {
  const { min, max } = gradYearBounds({ isAlumni });
  const r = checkIntRange(value, {
    min,
    max,
    allowEmpty: !required,
    label: 'Graduation year',
  });
  if (!r.ok) return r;
  const { empty, n } = parseNum(value);
  if (!empty && batchYear != null && batchYear !== '') {
    const b = parseInt(String(batchYear), 10);
    if (Number.isFinite(b) && n < b) {
      return err('Graduation year cannot be before admission year.');
    }
  }
  return ok();
}

function checkSalary(value, { required = false, label = 'Amount', max = SALARY_MAX } = {}) {
  const { empty, n } = parseNum(value);
  if (empty) return required ? err(`${label} is required.`) : ok();
  if (!Number.isFinite(n) || n <= 0) return err(`${label} must be greater than 0.`);
  if (n > max) return err(`${label} is too large.`);
  const warn = n > SALARY_WARN ? `${label} is unusually high (over ₹1 crore).` : null;
  return ok(warn);
}

function checkStipend(value, { required = false, label = 'Stipend' } = {}) {
  const r = checkSalary(value, { required, label, max: STIPEND_MAX });
  if (!r.ok) return r;
  const { n } = parseNum(value);
  const warn = Number.isFinite(n) && n > STIPEND_WARN ? `${label} is unusually high.` : r.warn;
  return ok(warn);
}

function checkDateYmd(value, { allowEmpty = false, minYmd, maxYmd, allowPast = true, label = 'Date' } = {}) {
  const ymd = toDateOnlyString(value);
  if (!ymd) return allowEmpty ? ok() : err(`${label} is required.`);
  const d = parseYmdToLocalDate(ymd);
  if (!d) return err(`Enter a valid ${label.toLowerCase()}.`);
  if (d.getFullYear() < MIN_PLACEMENT_YEAR) {
    return err(`${label} cannot be before ${MIN_PLACEMENT_YEAR}.`);
  }
  if (!allowPast) {
    const v = validatePlacementDate(ymd, { allowPast: false });
    if (!v.ok) return err(v.error);
  }
  if (minYmd) {
    const minD = parseYmdToLocalDate(minYmd);
    if (minD && d < minD) return err(`${label} is too early.`);
  }
  if (maxYmd) {
    const maxD = parseYmdToLocalDate(maxYmd);
    if (maxD && d > maxD) return err(`${label} is too late.`);
  }
  return ok();
}

function checkDob(value, { allowEmpty = true } = {}) {
  const ymd = toDateOnlyString(value);
  if (!ymd) return allowEmpty ? ok() : err('Date of birth is required.');
  const d = parseYmdToLocalDate(ymd);
  if (!d) return err('Enter a valid date of birth.');
  const today = startOfTodayLocal();
  const minDob = new Date(today);
  minDob.setFullYear(minDob.getFullYear() - 35);
  const maxDob = new Date(today);
  maxDob.setFullYear(maxDob.getFullYear() - 17);
  if (d < minDob || d > maxDob) {
    return err('Date of birth must imply an age between 17 and 35 years.');
  }
  return ok();
}

function checkDateRange(from, to, { allowPast = true, maxSpanYears = null } = {}) {
  const a = checkDateYmd(from, { allowEmpty: true, allowPast, label: 'Start date' });
  if (!a.ok) return a;
  const b = checkDateYmd(to, { allowEmpty: true, allowPast, label: 'End date' });
  if (!b.ok) return b;
  const ymdA = toDateOnlyString(from);
  const ymdB = toDateOnlyString(to);
  if (ymdA && ymdB) {
    const da = parseYmdToLocalDate(ymdA);
    const db = parseYmdToLocalDate(ymdB);
    if (da && db && da > db) return err('Start date must be on or before end date.');
    if (maxSpanYears && da && db) {
      const span = (db.getTime() - da.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (span > maxSpanYears) {
        return ok(`Date range spans more than ${maxSpanYears} years.`);
      }
    }
  }
  return ok();
}

/**
 * @param {string} fieldId
 * @param {unknown} value
 * @param {Record<string, unknown>} [ctx] — e.g. batchYear, salaryMin, dateFrom
 */
export function validateField(fieldId, value, ctx = {}) {
  switch (fieldId) {
    case FIELD_IDS.STUDENT_CGPA:
    case FIELD_IDS.COLLEGE_RULE_MIN_CGPA:
    case FIELD_IDS.EMPLOYER_MIN_CGPA:
      return checkCgpa(value, { required: Boolean(ctx.required), label: ctx.label || 'CGPA' });

    case FIELD_IDS.STUDENT_PERCENT:
      return checkPercent(value, { required: Boolean(ctx.required), label: ctx.label || 'Percentage' });

    case FIELD_IDS.STUDENT_BATCH_YEAR:
      return checkBatchYear(value, { required: Boolean(ctx.required), isAlumni: Boolean(ctx.isAlumni) });

    case FIELD_IDS.EMPLOYER_INTERNSHIP_BATCH_YEAR:
      return checkInternshipBatchYear(value, {
        required: Boolean(ctx.required),
        date: ctx.date instanceof Date ? ctx.date : undefined,
      });

    case FIELD_IDS.STUDENT_GRAD_YEAR:
      return checkGradYear(value, {
        batchYear: ctx.batchYear,
        required: Boolean(ctx.required),
        isAlumni: Boolean(ctx.isAlumni),
      });

    case FIELD_IDS.STUDENT_BACKLOGS_ACTIVE: {
      const base = checkIntRange(value, { min: 0, max: 20, allowZero: true, allowEmpty: true, label: 'Active backlogs' });
      if (!base.ok) return base;
      if (ctx.backlogsTotal != null && ctx.backlogsTotal !== '') {
        const active = Number.parseInt(String(value ?? '0'), 10) || 0;
        const total = Number.parseInt(String(ctx.backlogsTotal ?? '0'), 10) || 0;
        if (active > total) {
          return err('Active backlogs cannot exceed total backlogs.');
        }
      }
      return ok();
    }

    case FIELD_IDS.STUDENT_BACKLOGS_TOTAL: {
      const base = checkIntRange(value, { min: 0, max: 50, allowZero: true, allowEmpty: true, label: 'Total backlogs' });
      if (!base.ok) return base;
      if (ctx.backlogsActive != null && ctx.backlogsActive !== '') {
        const active = Number.parseInt(String(ctx.backlogsActive ?? '0'), 10) || 0;
        const total = Number.parseInt(String(value ?? '0'), 10) || 0;
        if (active > total) {
          return err('Active backlogs cannot exceed total backlogs.');
        }
      }
      return ok();
    }

    case FIELD_IDS.STUDENT_PASSING_YEAR:
      return checkIntRange(value, {
        min: 1995,
        max: NOW_YEAR + 1,
        allowEmpty: true,
        allowZero: false,
        label: 'Passing year',
      });

    case FIELD_IDS.STUDENT_SALARY_MIN:
      return checkSalary(value, { allowEmpty: true, label: 'Minimum expected salary' });

    case FIELD_IDS.STUDENT_SALARY_MAX:
      return checkSalary(value, { allowEmpty: true, label: 'Maximum expected salary' });

    case FIELD_IDS.STUDENT_DOB:
      return checkDob(value, { allowEmpty: !ctx.required });

    case FIELD_IDS.COLLEGE_OFFER_SALARY:
    case FIELD_IDS.EMPLOYER_OFFER_SALARY:
      return checkSalary(value, { required: Boolean(ctx.required), label: 'Salary' });

    case FIELD_IDS.COLLEGE_OFFER_DEADLINE:
    case FIELD_IDS.EMPLOYER_OFFER_DEADLINE:
      return checkDateYmd(value, {
        allowEmpty: !ctx.required,
        allowPast: false,
        label: 'Response deadline',
      });

    case FIELD_IDS.COLLEGE_OFFER_JOINING:
    case FIELD_IDS.EMPLOYER_OFFER_JOINING: {
      const join = checkDateYmd(value, {
        allowEmpty: !ctx.required,
        allowPast: false,
        label: 'Joining date',
      });
      if (!join.ok) return join;
      if (ctx.deadline) {
        const od = validateOfferDates(toDateOnlyString(ctx.deadline), toDateOnlyString(value));
        if (!od.ok) return err(od.error);
      }
      return ok();
    }

    case FIELD_IDS.COLLEGE_INTERVIEW_DATE:
    case FIELD_IDS.EMPLOYER_INTERVIEW_DATE:
    case FIELD_IDS.EMPLOYER_DRIVE_DATE:
    case FIELD_IDS.DATE_FUTURE:
      return checkDateYmd(value, {
        allowEmpty: !ctx.required,
        allowPast: false,
        label: ctx.label || 'Date',
      });

    case FIELD_IDS.COLLEGE_INFRA_DATE:
      return checkDateYmd(value, {
        allowEmpty: !ctx.required,
        allowPast: false,
        label: 'Booking date',
      });

    case FIELD_IDS.COLLEGE_FACILITY_CAPACITY: {
      if (value === '' || value == null) return ok();
      const { n } = parseNum(value);
      if (!Number.isFinite(n) || n < 1 || n > 10000) {
        return err('Capacity must be between 1 and 10,000 when provided.');
      }
      return ok();
    }

    case FIELD_IDS.COLLEGE_RULE_MAX_OFFERS:
      return checkIntRange(value, { min: 1, max: 5, allowEmpty: false, label: 'Max offers per student' });

    case FIELD_IDS.COLLEGE_RULE_ACCEPT_WINDOW:
      return checkIntRange(value, { min: 1, max: 90, allowEmpty: false, label: 'Acceptance window (days)' });

    case FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS:
      return checkIntRange(value, {
        min: 0,
        max: 20,
        allowZero: true,
        allowEmpty: true,
        label: ctx.label || 'Max active backlogs',
      });

    case FIELD_IDS.COLLEGE_RULE_BUFFER_DAYS:
      return checkIntRange(value, { min: 0, max: 30, allowZero: true, allowEmpty: false, label: 'Buffer days' });

    case FIELD_IDS.COLLEGE_RULE_DREAM_MULT: {
      const { empty, n } = parseNum(value);
      if (empty) return ok();
      if (!Number.isFinite(n) || n <= 0 || n > 10) return err('Multiplier must be greater than 0 and at most 10.');
      const warn = n > 5 ? 'Dream company multiplier above 5 is unusual.' : null;
      return ok(warn);
    }

    case FIELD_IDS.COLLEGE_RULE_SEASON_START:
    case FIELD_IDS.COLLEGE_ACAD_PERIOD_START:
    case FIELD_IDS.PROJECT_START:
      return checkDateYmd(value, { allowEmpty: !ctx.required, allowPast: true, label: ctx.label || 'Start date' });

    case FIELD_IDS.COLLEGE_RULE_SEASON_END:
    case FIELD_IDS.COLLEGE_ACAD_PERIOD_END:
    case FIELD_IDS.PROJECT_END:
      return checkDateYmd(value, { allowEmpty: !ctx.required, allowPast: true, label: ctx.label || 'End date' });

    case FIELD_IDS.COLLEGE_NIRF_RANK:
    case FIELD_IDS.ADMIN_NIRF_RANK: {
      const r = checkIntRange(value, { min: 1, max: 500, allowEmpty: true, label: 'NIRF rank' });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const warn = Number.isFinite(n) && n > 300 ? 'NIRF rank above 300 is uncommon.' : null;
      return ok(warn);
    }

    case FIELD_IDS.COLLEGE_PATENT_COUNT:
    case FIELD_IDS.COLLEGE_STARTUP_COUNT: {
      const r = checkIntRange(value, {
        min: 0,
        max: 100000,
        allowZero: true,
        allowEmpty: true,
        label: ctx.label || 'Count',
      });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const warn = Number.isFinite(n) && n > 10000 ? 'This count is unusually large.' : null;
      return ok(warn);
    }

    case FIELD_IDS.COLLEGE_ACAD_YEAR_SEQ:
      return checkIntRange(value, { min: 1, max: 20, allowEmpty: false, label: 'Sequence number' });

    case FIELD_IDS.EMPLOYER_SALARY_MIN:
      return checkSalary(value, { allowEmpty: true, label: 'Minimum salary' });

    case FIELD_IDS.EMPLOYER_SALARY_MAX: {
      const r = checkSalary(value, { allowEmpty: true, label: 'Maximum salary' });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const minN = parseNum(ctx.salaryMin).n;
      if (Number.isFinite(n) && Number.isFinite(minN) && n < minN) {
        return err('Maximum salary cannot be less than minimum salary.');
      }
      return r;
    }

    case FIELD_IDS.EMPLOYER_STIPEND_MIN:
      return checkStipend(value, { allowEmpty: true, label: 'Minimum stipend' });

    case FIELD_IDS.EMPLOYER_STIPEND_MAX: {
      const r = checkStipend(value, { allowEmpty: true, label: 'Maximum stipend' });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const minN = parseNum(ctx.stipendMin ?? ctx.salaryMin).n;
      if (Number.isFinite(n) && Number.isFinite(minN) && n < minN) {
        return err('Maximum stipend cannot be less than minimum stipend.');
      }
      return r;
    }

    case FIELD_IDS.EMPLOYER_VACANCIES:
    case FIELD_IDS.DRIVE_MAX_STUDENTS:
      return checkIntRange(value, {
        min: 1,
        max: 10000,
        allowEmpty: !ctx.required,
        label: ctx.label || 'Openings',
      });

    case FIELD_IDS.EMPLOYER_MIN_EXPERIENCE:
      return checkIntRange(value, {
        min: 0,
        max: 40,
        allowZero: true,
        allowEmpty: true,
        label: ctx.label || 'Minimum experience (years)',
      });

    case FIELD_IDS.EMPLOYER_MAX_EXPERIENCE: {
      const r = checkIntRange(value, {
        min: 0,
        max: 40,
        allowZero: true,
        allowEmpty: true,
        label: ctx.label || 'Maximum experience (years)',
      });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const minN = parseNum(ctx.minExperience).n;
      if (Number.isFinite(n) && Number.isFinite(minN) && n < minN) {
        return err('Maximum experience cannot be less than minimum experience.');
      }
      return r;
    }

    case FIELD_IDS.EMPLOYER_NOTICE_PERIOD:
      return checkIntRange(value, {
        min: 0,
        max: 180,
        allowZero: true,
        allowEmpty: true,
        label: ctx.label || 'Notice period (days)',
      });

    case FIELD_IDS.EMPLOYER_INTERVIEW_ASSIGNED: {
      const r = checkIntRange(value, {
        min: 0,
        max: 5000,
        allowZero: true,
        allowEmpty: true,
        label: 'Assigned students',
      });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const warn = Number.isFinite(n) && n > 500 ? 'Assigned count over 500 is unusual.' : null;
      return ok(warn);
    }

    case FIELD_IDS.EMPLOYER_FOUNDED_YEAR:
      return checkIntRange(value, {
        min: 1600,
        max: NOW_YEAR,
        allowEmpty: true,
        label: 'Founded year',
      });

    case FIELD_IDS.ADMIN_SESSION_TIMEOUT:
      return checkIntRange(value, { min: 1, max: 999, allowEmpty: false, label: 'Session timeout' });

    case FIELD_IDS.ADMIN_SMTP_PORT: {
      const r = checkIntRange(value, { min: 1, max: 65535, allowEmpty: false, label: 'SMTP port' });
      if (!r.ok) return r;
      const { n } = parseNum(value);
      const standard = [25, 465, 587];
      const warn = Number.isFinite(n) && !standard.includes(n) ? 'SMTP port is not a common value (25, 465, 587).' : null;
      return ok(warn);
    }

    case FIELD_IDS.ADMIN_MAX_UPLOAD_MB:
      return checkIntRange(value, { min: 1, max: 500, allowEmpty: false, label: 'Max upload size (MB)' });

    case FIELD_IDS.DATE_RANGE_FROM:
      return checkDateRange(value, ctx.dateTo, { allowPast: true, maxSpanYears: ctx.maxSpanYears ?? 2 });

    case FIELD_IDS.DATE_RANGE_TO:
      return checkDateRange(ctx.dateFrom, value, { allowPast: true, maxSpanYears: ctx.maxSpanYears ?? 2 });

    case FIELD_IDS.DATE_ANY:
      return checkDateYmd(value, { allowEmpty: !ctx.required, allowPast: true, label: ctx.label || 'Date' });

    case FIELD_IDS.EDUCATION_BOARD: {
      const boardErr = validateEducationBoard(value, {
        label: ctx.label || 'Board',
        allowEmpty: !ctx.required,
      });
      if (boardErr) return err(boardErr);
      return ok();
    }

    case FIELD_IDS.COMMON_TITLE: {
      const titleErr = validateTitle(value, {
        required: ctx.required !== false,
        label: ctx.label || 'Title',
        minLength: ctx.minLength ?? 3,
        maxLength: ctx.maxLength ?? MAX_TITLE_LENGTH,
      });
      if (titleErr) return err(titleErr);
      return ok();
    }

    default:
      return ok();
  }
}

/**
 * @param {string} message
 */
export function confirmWarning(message) {
  if (!message || typeof window === 'undefined') return true;
  return window.confirm(`${message}\n\nContinue anyway?`);
}

/**
 * Validate and optionally confirm warnings (client-side).
 * @returns {{ proceed: boolean, error: string | null }}
 */
export function validateFieldWithConfirm(fieldId, value, ctx = {}) {
  const result = validateField(fieldId, value, ctx);
  if (!result.ok) return { proceed: false, error: result.error };
  if (result.warn && !confirmWarning(result.warn)) {
    return { proceed: false, error: null };
  }
  return { proceed: true, error: null };
}

/** Server-side: first error string or null (includes [VAL-…] prefix). */
export function validateFieldOrError(fieldId, value, ctx = {}) {
  const r = validateField(fieldId, value, ctx);
  return r.ok ? null : formatValidationError(fieldId, r.error);
}

/** Pair salary min/max for forms. */
export function validateSalaryPair(minVal, maxVal, fieldMinId, fieldMaxId) {
  const e1 = validateFieldOrError(fieldMinId, minVal);
  if (e1) return e1;
  const e2 = validateFieldOrError(fieldMaxId, maxVal, { salaryMin: minVal });
  if (e2) return e2;
  return null;
}

/** Active backlogs must not exceed total backlogs (history). */
export function validateStudentBacklogPair(backlogsActive, backlogsHistory) {
  const e1 = validateFieldOrError(FIELD_IDS.STUDENT_BACKLOGS_ACTIVE, backlogsActive, {
    backlogsTotal: backlogsHistory,
  });
  if (e1) return e1;
  return validateFieldOrError(FIELD_IDS.STUDENT_BACKLOGS_TOTAL, backlogsHistory, {
    backlogsActive,
  });
}
