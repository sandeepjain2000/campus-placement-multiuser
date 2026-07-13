/**
 * Server-side validation using the same rules as UI (inputConstraints).
 */

import { validateFieldOrError, FIELD_IDS, validateSalaryPair, validateStudentBacklogPair } from '@/lib/inputConstraints';
import { validateEducationDetails, validateStudentProfileEmails } from '@/lib/validators';
import { coerceEmployerMinCgpaInput } from '@/lib/employerJobDisplay';

export { FIELD_IDS };

export function rejectIfInvalid(errors) {
  const list = errors.filter(Boolean);
  if (!list.length) return null;
  return list[0];
}

export function validateEducationDetailsPayload(educationDetails) {
  return validateEducationDetails(educationDetails);
}

export function validateStudentProfileEmailsPayload(fields) {
  const err = validateStudentProfileEmails(fields);
  return err || null;
}

export function validateStudentAcademicPayload(fields) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.STUDENT_CGPA, fields.cgpa),
    validateFieldOrError(FIELD_IDS.STUDENT_PERCENT, fields.tenthPercentage, { label: 'Class X %' }),
    validateFieldOrError(FIELD_IDS.STUDENT_PERCENT, fields.twelfthPercentage, { label: 'Class XII %' }),
    validateFieldOrError(FIELD_IDS.STUDENT_PERCENT, fields.diplomaPercentage, { label: 'Diploma %' }),
    validateFieldOrError(FIELD_IDS.STUDENT_BATCH_YEAR, fields.batchYear, {
      isAlumni: Boolean(fields.isAlumni),
    }),
    validateFieldOrError(FIELD_IDS.STUDENT_GRAD_YEAR, fields.graduationYear, {
      batchYear: fields.batchYear,
      isAlumni: Boolean(fields.isAlumni),
    }),
    validateFieldOrError(FIELD_IDS.STUDENT_BACKLOGS_ACTIVE, fields.backlogsActive),
    validateFieldOrError(FIELD_IDS.STUDENT_BACKLOGS_TOTAL, fields.backlogsHistory),
    validateStudentBacklogPair(fields.backlogsActive, fields.backlogsHistory),
    validateSalaryPair(
      fields.expectedSalaryMin,
      fields.expectedSalaryMax,
      FIELD_IDS.STUDENT_SALARY_MIN,
      FIELD_IDS.STUDENT_SALARY_MAX,
    ),
  ]);
}

export function validateCollegeOfferPayload({ salary, deadline, joiningDate }) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.COLLEGE_OFFER_SALARY, salary),
    validateFieldOrError(FIELD_IDS.COLLEGE_OFFER_DEADLINE, deadline),
    validateFieldOrError(FIELD_IDS.COLLEGE_OFFER_JOINING, joiningDate, { deadline }),
  ]);
}

export function validateCollegeRulesPayload(rules) {
  if (!rules) return null;
  const seasonEndErr =
    rules.seasonStart && rules.seasonEnd
      ? validateFieldOrError(FIELD_IDS.DATE_RANGE_FROM, rules.seasonStart, { dateTo: rules.seasonEnd })
      : validateFieldOrError(FIELD_IDS.COLLEGE_RULE_SEASON_END, rules.seasonEnd);
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_MAX_OFFERS, rules.maxOffers),
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_ACCEPT_WINDOW, rules.acceptanceWindow),
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_MIN_CGPA, rules.minCGPA),
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS, rules.maxBacklogs),
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_BUFFER_DAYS, rules.bufferDays),
    rules.dreamCompanyMultiplier != null && rules.dreamCompanyMultiplier !== ''
      ? validateFieldOrError(FIELD_IDS.COLLEGE_RULE_DREAM_MULT, rules.dreamCompanyMultiplier)
      : null,
    validateFieldOrError(FIELD_IDS.COLLEGE_RULE_SEASON_START, rules.seasonStart),
    seasonEndErr,
  ]);
}

/** Job types that use stipend fields (not annual salary). */
export const EMPLOYER_STIPEND_JOB_TYPES = new Set(['internship', 'short_project', 'hackathon']);

export function employerCompensationFieldIds(jobType) {
  if (EMPLOYER_STIPEND_JOB_TYPES.has(jobType)) {
    return { minId: FIELD_IDS.EMPLOYER_STIPEND_MIN, maxId: FIELD_IDS.EMPLOYER_STIPEND_MAX };
  }
  return { minId: FIELD_IDS.EMPLOYER_SALARY_MIN, maxId: FIELD_IDS.EMPLOYER_SALARY_MAX };
}

export function validateEmployerJobPayload({ salaryMin, salaryMax, minCgpa, vacancies, jobType }) {
  const { minId, maxId } = employerCompensationFieldIds(jobType);
  return rejectIfInvalid([
    validateSalaryPair(salaryMin, salaryMax, minId, maxId),
    validateFieldOrError(FIELD_IDS.EMPLOYER_MIN_CGPA, coerceEmployerMinCgpaInput(minCgpa)),
    vacancies != null && vacancies !== ''
      ? validateFieldOrError(FIELD_IDS.EMPLOYER_VACANCIES, vacancies)
      : null,
  ]);
}

/** Drive date on employer request/edit forms (required when UI shows *). */
export function validateTitlePayload(title, { label = 'Title', required = true, maxLength } = {}) {
  return validateFieldOrError(FIELD_IDS.COMMON_TITLE, title, { label, required, maxLength });
}

export function validateEmployerDriveDate(driveDate, { required = true } = {}) {
  if (driveDate == null || String(driveDate).trim() === '') {
    return required ? 'Drive date is required.' : null;
  }
  return validateFieldOrError(FIELD_IDS.EMPLOYER_DRIVE_DATE, driveDate);
}

export function validateMaxBacklogsPayload(value) {
  return validateFieldOrError(
    FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS,
    value === '' || value == null ? '0' : value,
    { label: 'Max active backlogs' },
  );
}

export function validateInternshipBatchYearPayload(value, { required = false } = {}) {
  return validateFieldOrError(FIELD_IDS.EMPLOYER_INTERNSHIP_BATCH_YEAR, value, { required });
}

export function validateEmployerOfferPayload({ salary, deadline, joiningDate }) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.EMPLOYER_OFFER_SALARY, salary),
    validateFieldOrError(FIELD_IDS.EMPLOYER_OFFER_DEADLINE, deadline),
    validateFieldOrError(FIELD_IDS.EMPLOYER_OFFER_JOINING, joiningDate, { deadline }),
  ]);
}

export function validateDataEntryStudentPayload(fields) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.STUDENT_CGPA, fields.cgpa, { required: true }),
    validateFieldOrError(FIELD_IDS.STUDENT_BATCH_YEAR, fields.batchYear),
    validateFieldOrError(FIELD_IDS.STUDENT_GRAD_YEAR, fields.graduationYear, {
      batchYear: fields.batchYear,
    }),
  ]);
}

export function validateDataEntryOfferPayload({ salary, joiningDate }) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.EMPLOYER_OFFER_SALARY, salary),
    validateFieldOrError(FIELD_IDS.EMPLOYER_OFFER_JOINING, joiningDate),
  ]);
}

export function validateDataEntryDrivePayload({ driveDate, maxStudents }) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.EMPLOYER_DRIVE_DATE, driveDate, { required: true }),
    validateFieldOrError(FIELD_IDS.DRIVE_MAX_STUDENTS, maxStudents),
  ]);
}

export function validateAdminSettingsPayload({ sessionTimeoutValue, smtpPort, maxUploadSizeMb }) {
  return rejectIfInvalid([
    validateFieldOrError(FIELD_IDS.ADMIN_SESSION_TIMEOUT, sessionTimeoutValue),
    validateFieldOrError(FIELD_IDS.ADMIN_SMTP_PORT, smtpPort),
    validateFieldOrError(FIELD_IDS.ADMIN_MAX_UPLOAD_MB, maxUploadSizeMb),
  ]);
}

export function validateAcademicYearsList(years) {
  if (!Array.isArray(years)) return null;
  for (const y of years) {
    const seqErr = validateFieldOrError(FIELD_IDS.COLLEGE_ACAD_YEAR_SEQ, y.sequenceNumber);
    if (seqErr) return seqErr;
    const startErr = validateFieldOrError(FIELD_IDS.COLLEGE_ACAD_PERIOD_START, y.periodStart);
    if (startErr) return startErr;
    const endErr =
      y.periodStart && y.periodEnd
        ? validateFieldOrError(FIELD_IDS.DATE_RANGE_FROM, y.periodStart, { dateTo: y.periodEnd })
        : validateFieldOrError(FIELD_IDS.COLLEGE_ACAD_PERIOD_END, y.periodEnd);
    if (endErr) return endErr;
    for (const sem of y.semesters || []) {
      const sStart = validateFieldOrError(FIELD_IDS.PROJECT_START, sem.periodStart);
      if (sStart) return sStart;
      const sEnd =
        sem.periodStart && sem.periodEnd
          ? validateFieldOrError(FIELD_IDS.DATE_RANGE_FROM, sem.periodStart, { dateTo: sem.periodEnd })
          : validateFieldOrError(FIELD_IDS.PROJECT_END, sem.periodEnd);
      if (sEnd) return sEnd;
    }
  }
  return null;
}
