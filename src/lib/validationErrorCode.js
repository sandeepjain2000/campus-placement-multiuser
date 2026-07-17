/**
 * Stable prefixes for form/API validation messages (support + QA).
 * Format: [VAL-{FIELD}-{RULE}] Human-readable message
 */

/** @type {Record<string, string>} */
const FIELD_CODE_MAP = {
  'student.cgpa': 'STU-CGPA',
  'student.percent': 'STU-PCT',
  'student.batchYear': 'STU-BATCH',
  'student.graduationYear': 'STU-GRAD',
  'student.backlogsActive': 'STU-BKL-ACT',
  'student.backlogsTotal': 'STU-BKL-TOT',
  'student.passingYear': 'STU-PASS',
  'student.salaryMin': 'STU-SAL-MIN',
  'student.salaryMax': 'STU-SAL-MAX',
  'student.dateOfBirth': 'STU-DOB',
  'student.educationBoard': 'STU-BOARD',

  'college.offer.salary': 'COL-OFF-SAL',
  'college.offer.deadline': 'COL-OFF-DL',
  'college.offer.joining': 'COL-OFF-JOIN',
  'college.interview.date': 'COL-INT-DT',
  'college.infrastructure.date': 'COL-INF-DT',
  'college.facility.capacity': 'COL-FAC-CAP',
  'college.rule.maxOffers': 'COL-RUL-OFF',
  'college.rule.acceptanceWindow': 'COL-RUL-ACC',
  'college.rule.minCgpa': 'COL-RUL-CGPA',
  'college.rule.maxBacklogs': 'COL-RUL-BKL',
  'college.rule.bufferDays': 'COL-RUL-BUF',
  'college.rule.dreamMultiplier': 'COL-RUL-DRM',
  'college.rule.seasonStart': 'COL-RUL-SS',
  'college.rule.seasonEnd': 'COL-RUL-SE',
  'college.nirfRank': 'COL-NIRF',
  'college.patentCount': 'COL-PAT',
  'college.startupCount': 'COL-STU',
  'college.academicYear.sequence': 'COL-AY-SEQ',
  'college.academicYear.periodStart': 'COL-AY-PS',
  'college.academicYear.periodEnd': 'COL-AY-PE',

  'employer.salaryMin': 'EMP-SAL-MIN',
  'employer.salaryMax': 'EMP-SAL-MAX',
  'employer.stipendMin': 'EMP-STP-MIN',
  'employer.stipendMax': 'EMP-STP-MAX',
  'employer.vacancies': 'EMP-VAC',
  'employer.minExperience': 'EMP-EXP-MIN',
  'employer.maxExperience': 'EMP-EXP-MAX',
  'employer.noticePeriodDays': 'EMP-NOTICE',
  'employer.minCgpa': 'EMP-CGPA',
  'employer.drive.date': 'EMP-DRV-DT',
  'employer.interview.date': 'EMP-INT-DT',
  'employer.interview.assigned': 'EMP-INT-ASN',
  'employer.internship.batchYear': 'EMP-INT-BATCH',
  'employer.foundedYear': 'EMP-FOUND',
  'employer.offer.salary': 'EMP-OFF-SAL',
  'employer.offer.deadline': 'EMP-OFF-DL',
  'employer.offer.joining': 'EMP-OFF-JOIN',

  'admin.nirfRank': 'ADM-NIRF',
  'admin.pincode': 'ADM-PIN',
  'admin.sessionTimeout': 'ADM-SESS',
  'admin.smtpPort': 'ADM-SMTP',
  'admin.maxUploadMb': 'ADM-UPL',

  'common.dateRangeFrom': 'COM-DT-FR',
  'common.dateRangeTo': 'COM-DT-TO',
  'common.dateFuture': 'COM-DT-FUT',
  'common.dateAny': 'COM-DT',
  'common.title': 'COM-TITLE',
  'common.projectStart': 'COM-PRJ-S',
  'common.projectEnd': 'COM-PRJ-E',

  'auth.email': 'AUTH-EMAIL',
  'auth.password': 'AUTH-PWD',
  'auth.phone': 'AUTH-PHONE',
  'auth.firstName': 'AUTH-FN',
  'auth.lastName': 'AUTH-LN',
  'auth.role': 'AUTH-ROLE',
  'auth.campusBindingToken': 'AUTH-CAMPUS',
  'auth.department': 'AUTH-DEPT',
  'student.name': 'STU-NAME',
  'student.rollNo': 'STU-ROLL',
  'student.branch': 'STU-BRANCH',
  'student.email': 'STU-EMAIL',
  'student.commEmail': 'STU-CEMAIL',
  'student.program': 'STU-PROG',
  'student.semester': 'STU-SEM',
  'student.placementStatus': 'STU-JOB',
  'student.internshipStatus': 'STU-INT',
  'student.photo': 'STU-PHOTO',
  'student.linkedin': 'STU-LI',
  'student.github': 'STU-GH',
  'student.portfolio': 'STU-PORT',
  'student.resumeUrl': 'STU-RESUME',
  'employer.jobType': 'EMP-JTYPE',
  'employer.salaryRange': 'EMP-SAL-RNG',

  'drive.maxStudents': 'DRV-CAP',
};

const VAL_PREFIX_RE = /^\[VAL-[A-Z0-9-]+\]\s*/;

/**
 * @param {string} fieldId
 */
export function fieldIdToValidationPrefix(fieldId) {
  if (FIELD_CODE_MAP[fieldId]) return FIELD_CODE_MAP[fieldId];
  const slug = String(fieldId || 'unknown')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return slug.slice(0, 16) || 'UNKNOWN';
}

/**
 * @param {string} message
 */
export function inferValidationRuleSuffix(message) {
  const text = String(message || '');
  if (/is required\.?$/i.test(text) || /^no file/i.test(text) || /select an academic/i.test(text)) return 'REQ';
  if (/must be a number|must be a positive number/i.test(text)) return 'NUM';
  if (/enter a valid|invalid (email|placement|internship)|use (a |international)|must be a valid url|please use a jpeg/i.test(text)) {
    return 'FMT';
  }
  if (/must be between|cannot be|must be greater|must be at most|too (large|early|late)|cannot exceed|must be 1|on or after|file is empty/i.test(text)) {
    return 'RNG';
  }
  if (/cloud storage|s3|not configured|upload failed|access denied/i.test(text)) return 'S3';
  return 'VAL';
}

/**
 * @param {string} fieldId
 * @param {string} message
 */
export function buildValidationErrorCode(fieldId, message) {
  return `VAL-${fieldIdToValidationPrefix(fieldId)}-${inferValidationRuleSuffix(message)}`;
}

/**
 * @param {string} fieldId
 * @param {string} message
 */
export function formatValidationError(fieldId, message) {
  const text = String(message || '').trim();
  if (!text) return `[${buildValidationErrorCode(fieldId, 'Validation failed')}] Validation failed`;
  if (VAL_PREFIX_RE.test(text)) return text;
  return `[${buildValidationErrorCode(fieldId, text)}] ${text}`;
}

/**
 * Strip validation code prefix for display-only contexts.
 * @param {string} message
 */
export function stripValidationErrorCode(message) {
  return String(message || '').replace(VAL_PREFIX_RE, '').trim();
}
