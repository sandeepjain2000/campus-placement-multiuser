/**
 * Input validation helpers for the Campus Placement platform
 */

import { formatValidationError, stripValidationErrorCode } from '@/lib/validationErrorCode';

/** Prefix a validation message with [VAL-{FIELD}-{RULE}] when non-empty. */
function val(fieldId, message) {
  const text = String(message || '').trim();
  if (!text) return '';
  return formatValidationError(fieldId, text);
}

function personNameFieldId(label) {
  const l = String(label || 'Name').toLowerCase();
  if (l.includes('first')) return 'auth.firstName';
  if (l.includes('last')) return 'auth.lastName';
  return 'student.name';
}

export function validateEmail(email) {
  const trimmed = String(email || '').trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(trimmed);
}

/** Returns an error message, or empty string when valid. */
export function getEmailValidationError(email, { required = true } = {}) {
  const trimmed = String(email || '').trim();
  if (!trimmed) return required ? val('auth.email', 'Email is required.') : '';
  if (!validateEmail(trimmed)) {
    return val('auth.email', 'Enter a valid email address (e.g. name@example.com).');
  }
  return '';
}

/** Returns an error message, or empty string when valid. */
export function validateStudentProfileEmails({ communicationEmail, emails } = {}) {
  const comm = String(communicationEmail || '').trim();
  if (comm && !validateEmail(comm)) {
    return val('student.email', 'Communication email must be a valid email address (e.g. name@example.com).');
  }

  const rows = Array.isArray(emails) ? emails : [];
  for (const row of rows) {
    const value = String(row?.value || '').trim();
    if (!value) continue;
    const label = String(row?.label || 'Email').trim() || 'Email';
    if (!validateEmail(value)) {
      return val('student.email', `${label} must be a valid email address (e.g. name@example.com).`);
    }
  }
  return '';
}

export const MAX_STUDENT_BRANCH_LENGTH = 100;

/** Department, branch, and specialisation fields on student profiles. */
export function validateStudentBranchField(value, { label = 'Branch / specialisation' } = {}) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (s.length > MAX_STUDENT_BRANCH_LENGTH) {
    return val('student.branch', `${label} must be ${MAX_STUDENT_BRANCH_LENGTH} characters or fewer`);
  }
  return '';
}

/**
 * Person name: Unicode letters + marks, spaces, and connectors common across naming traditions
 * (hyphens, apostrophes, periods for initials, middle dot).
 */
const NAME_WORD = String.raw`[\p{L}\p{M}]+(?:[\u0027\u2019\u02BC.\u00B7-][\p{L}\p{M}]+)*`;
const NAME_INITIAL = String.raw`[\p{L}\p{M}]\.`;
const NAME_PART = String.raw`(?:${NAME_INITIAL}|${NAME_WORD})`;
export const PERSON_NAME_PATTERN = new RegExp(`^${NAME_PART}(?:\\s+${NAME_PART})*$`, 'u');

export function normalizePersonName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validatePersonName(name, { required = true, label = 'Name' } = {}) {
  const fieldId = personNameFieldId(label);
  const s = normalizePersonName(name);
  if (!s) return required ? val(fieldId, `${label} is required`) : '';
  if (s.length < 2) return val(fieldId, `${label} must be at least 2 characters`);
  if (s.length > 100) return val(fieldId, `${label} is too long`);
  if (/\d/.test(s)) return val(fieldId, `${label} cannot contain numbers`);
  if (/[^\p{L}\p{M}\s\u0027\u2019\u02BC.\u00B7-]/u.test(s)) {
    return val(
      fieldId,
      `${label} may only contain letters and common name characters (spaces, hyphens, apostrophes, periods)`,
    );
  }
  if (!PERSON_NAME_PATTERN.test(s)) {
    return val(
      fieldId,
      `${label} must use letters with spaces or connectors (e.g. hyphen, apostrophe) between name parts`,
    );
  }
  return '';
}

/** Roll / system-id body after college prefix is removed (alphanumeric, hyphens, underscores). */
const ROLL_BODY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function validateRollBody(roll) {
  const s = String(roll || '').trim();
  if (!s) return { error: val('student.rollNo', 'Roll No is required') };
  if (s.length > 48) return { error: val('student.rollNo', 'Roll No is too long') };
  if (!ROLL_BODY_PATTERN.test(s)) {
    return { error: val('student.rollNo', 'Roll No may only contain letters, numbers, hyphens, and underscores') };
  }
  return { rollNumber: s };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize roll input and enforce college system-id prefix when short_code is set.
 * Accepts bare roll (CS2021001) or prefixed (IITM-CS2021001). Rejects another college prefix (BITS-…).
 */
export function resolveStudentRollNumber(rawInput, shortCode) {
  const input = String(rawInput || '').trim();
  if (!input) return { error: val('student.rollNo', 'Roll No is required') };

  const code = String(shortCode || '').trim();
  if (!code) {
    const body = validateRollBody(input);
    if (body.error) return body;
    return { rollNumber: body.rollNumber, systemId: body.rollNumber };
  }

  const prefixRe = new RegExp(`^${escapeRegExp(code)}-`, 'i');
  if (prefixRe.test(input)) {
    const rollPart = input.slice(code.length + 1).trim();
    const body = validateRollBody(rollPart);
    if (body.error) return body;
    return {
      rollNumber: body.rollNumber,
      systemId: `${code}-${body.rollNumber}`,
    };
  }

  const dash = input.indexOf('-');
  if (dash > 0) {
    const head = input.slice(0, dash);
    const tail = input.slice(dash + 1).trim();
    if (/^[A-Za-z]{2,12}$/.test(head) && !/\d/.test(head) && head.toLowerCase() !== code.toLowerCase()) {
      return {
        error: val('student.rollNo', `System ID must use your college prefix "${code}-" (found "${head}-")`),
      };
    }
    if (!tail && head.toLowerCase() === code.toLowerCase()) {
      return { error: val('student.rollNo', 'Roll No is required after college prefix') };
    }
  }

  const body = validateRollBody(input);
  if (body.error) return body;
  return {
    rollNumber: body.rollNumber,
    systemId: `${code}-${body.rollNumber}`,
  };
}

/** Validate full student name and split into first / last for storage. */
export function parseStudentFullName(name) {
  const fullName = normalizePersonName(name);
  const error = validatePersonName(fullName, { required: true, label: 'Name' });
  if (error) return { error };
  const parts = fullName.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { firstName, lastName, fullName };
}

/** Admission / batch start year (e.g. UG batch of 2024). */
export function validateBatchYear(yearStr, { required = false } = {}) {
  const raw = String(yearStr ?? '').trim();
  if (!raw) return required ? val('student.batchYear', 'Batch year is required') : '';
  const y = parseInt(raw, 10);
  if (!/^\d{4}$/.test(raw) || Number.isNaN(y)) {
    return val('student.batchYear', 'Enter batch year as a 4-digit year (e.g. 2024)');
  }
  const now = new Date().getFullYear();
  const min = now - 12;
  const max = now + 8;
  if (y < min || y > max) return val('student.batchYear', `Batch year must be between ${min} and ${max}`);
  return '';
}

/** Minimum length for user-chosen passwords (register, change, reset). */
export const PASSWORD_MIN_LENGTH = 10;

/** Form hints and placeholders. */
export const PASSWORD_REQUIREMENTS_HINT =
  'At least 10 characters with uppercase, lowercase, a number, and a special character';

/** API / validation summary message. */
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 10 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&* etc.)';

const PASSWORD_SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

/** Returns an error message, or empty string when valid. */
export function getPasswordValidationError(password) {
  const s = String(password ?? '');
  if (!s) return val('auth.password', 'Password is required');
  if (s.length < PASSWORD_MIN_LENGTH) {
    return val('auth.password', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[a-z]/.test(s)) return val('auth.password', 'Password must include a lowercase letter');
  if (!/[A-Z]/.test(s)) return val('auth.password', 'Password must include an uppercase letter');
  if (!/\d/.test(s)) return val('auth.password', 'Password must include a number');
  if (!PASSWORD_SPECIAL_CHAR_RE.test(s)) {
    return val('auth.password', 'Password must include a special character (!@#$%^&* etc.)');
  }
  return '';
}

export function validatePassword(password) {
  return !getPasswordValidationError(password);
}

/** E.164: leading +, country code, 8–15 digits total (spaces/dashes stripped). */
export function validatePhone(phone) {
  return !getPhoneValidationError(phone, { required: false });
}

/** Returns an error message, or empty string when valid. Empty allowed unless required. */
export function getPhoneValidationError(phone, { required = false } = {}) {
  if (phone == null || String(phone).trim() === '') {
    return required ? val('auth.phone', 'Mobile number is required.') : '';
  }
  const compact = String(phone).replace(/[\s-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    return val('auth.phone', 'Enter a valid mobile number with country code (e.g. +91 9876543210).');
  }
  if (compact.startsWith('+91')) {
    const national = compact.slice(3);
    if (national.length !== 10 || !/^[6-9]\d{9}$/.test(national)) {
      return val('auth.phone', 'Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9.');
    }
  } else if (compact.startsWith('+1')) {
    const national = compact.slice(2);
    if (national.length !== 10 || !/^\d{10}$/.test(national)) {
      return val('auth.phone', 'US/Canada numbers must be 10 digits after +1.');
    }
  }
  return '';
}

/** Strip letters, emoji, and other non-phone characters from typed input. */
export function sanitizePhoneInput(raw) {
  return String(raw ?? '').replace(/[^\d+\s()-]/g, '');
}

/**
 * Validate a list of labelled phone rows (student profile).
 * @returns {string} error message or empty string
 */
export function getPhonesListValidationError(phones) {
  const rows = Array.isArray(phones) ? phones : [];
  for (const row of rows) {
    const value = String(row?.value || '').trim();
    if (!value) continue;
    const err = getPhoneValidationError(value, { required: false });
    if (err) return err;
  }
  return '';
}

/** Build E.164 phone from registration form dial code + national number. */
export function buildRegistrationPhoneE164({ phoneDialCode, phoneNational, PHONE_FULL_E164 = '__full__' }) {
  if (phoneDialCode === PHONE_FULL_E164) {
    const raw = String(phoneNational || '').trim().replace(/[\s-]/g, '');
    if (!raw) return '';
    return raw.startsWith('+') ? raw : `+${raw.replace(/^\++/, '')}`;
  }
  const digits = String(phoneNational || '').replace(/\D/g, '');
  const dial = String(phoneDialCode || '').trim() || '+';
  if (!digits) return '';
  return `${dial.startsWith('+') ? dial : `+${dial}`}${digits}`;
}

/** Validate mobile on the registration form (dial picker + national input). */
export function getRegistrationPhoneValidationError(
  { phoneDialCode, phoneNational, PHONE_FULL_E164 = '__full__' },
  { required = false } = {},
) {
  const nationalRaw = String(phoneNational || '').trim();
  if (!nationalRaw) {
    return required ? val('auth.phone', 'Mobile number is required.') : '';
  }
  const e164 = buildRegistrationPhoneE164({ phoneDialCode, phoneNational, PHONE_FULL_E164 });
  return getPhoneValidationError(e164, { required: true });
}

export function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateCGPA(cgpa) {
  const num = parseFloat(cgpa);
  return !isNaN(num) && num >= 0 && num <= 10;
}

/** Student / college-record CGPA: when set, must be in (0, 10]. Empty allowed unless required. */
export function validateStudentCgpa(cgpa, { required = false } = {}) {
  const raw = cgpa === '' || cgpa == null ? '' : String(cgpa).trim();
  if (!raw) return required ? val('student.cgpa', 'CGPA is required') : '';
  const num = parseFloat(raw);
  if (!Number.isFinite(num) || num <= 0 || num > 10) {
    return val('student.cgpa', 'CGPA must be greater than 0 and at most 10');
  }
  return '';
}

export function parseStudentCgpaOrNull(cgpa, options = {}) {
  const err = validateStudentCgpa(cgpa, options);
  if (err) return { error: err };
  const raw = cgpa === '' || cgpa == null ? '' : String(cgpa).trim();
  if (!raw) return { value: null };
  return { value: parseFloat(raw) };
}

export function validatePercentage(pct) {
  const num = parseFloat(pct);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/** Board / diploma percentage: when set, must be in [0, 100]. Empty allowed unless required. */
export function validateStudentPercentage(pct, { label = 'Percentage', required = false } = {}) {
  const raw = pct === '' || pct == null ? '' : String(pct).trim();
  if (!raw) return required ? val('student.percent', `${label} is required`) : '';
  const num = parseFloat(raw);
  if (!Number.isFinite(num) || num <= 0 || num > 100) {
    return val('student.percent', `${label} must be greater than 0 and at most 100`);
  }
  return '';
}

export function parseStudentPercentageOrNull(pct, label, options = {}) {
  const err = validateStudentPercentage(pct, { label, required: options.required });
  if (err) return { error: err };
  const raw = pct === '' || pct == null ? '' : String(pct).trim();
  if (!raw) return { value: null };
  return { value: parseFloat(raw) };
}

/**
 * Validate CGPA (≤10) and academic percentages (≤100) for student profiles.
 * Accepts camelCase or snake_case field names.
 */
/** Board / university name: when set, must contain at least one letter (not digits-only). */
export function validateEducationBoard(value, { label = 'Board', allowEmpty = true } = {}) {
  const s = String(value ?? '').trim();
  if (!s) return allowEmpty ? '' : val('student.educationBoard', `${label} is required.`);
  if (!/\p{L}/u.test(s)) {
    return val('student.educationBoard', `${label} must include at least one letter (e.g. CBSE, ICSE, State Board).`);
  }
  return '';
}

const EDUCATION_LEVEL_LABELS = {
  graduation: 'University / degree',
  diploma: 'Diploma board',
  twelfth: 'Class XII board',
  tenth: 'Class X board',
};

/** Validate board names under educationDetails (graduation / tenth / twelfth / diploma). */
export function validateEducationDetails(details = {}) {
  if (!details || typeof details !== 'object') return null;
  for (const [key, label] of Object.entries(EDUCATION_LEVEL_LABELS)) {
    const row = details[key];
    if (!row || typeof row !== 'object') continue;
    const err = validateEducationBoard(row.board, { label, allowEmpty: true });
    if (err) return err;
  }
  return null;
}

export function validateStudentAcademicScores(fields = {}) {
  const cgpa = fields.cgpa;
  const tenth = fields.tenthPercentage ?? fields.tenth_percentage;
  const twelfth = fields.twelfthPercentage ?? fields.twelfth_percentage;
  const diploma = fields.diplomaPercentage ?? fields.diploma_percentage;

  const cgpaErr = validateStudentCgpa(cgpa, { required: Boolean(fields.cgpaRequired) });
  if (cgpaErr) return cgpaErr;

  for (const [val, label] of [
    [tenth, 'Class X %'],
    [twelfth, 'Class XII %'],
    [diploma, 'Diploma %'],
  ]) {
    const err = validateStudentPercentage(val, { label });
    if (err) return err;
  }
  return null;
}

export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

export function validateRequired(obj, fields) {
  const missing = [];
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      missing.push(field);
    }
  }
  return missing;
}

export function validateRegistration(data) {
  const errors = {};

  const emailErr = getEmailValidationError(data.email, { required: true });
  if (emailErr) errors.email = emailErr;

  const phoneErr = getPhoneValidationError(data.phone, { required: false });
  if (phoneErr) errors.phone = phoneErr;
  const passwordErr = getPasswordValidationError(data.password);
  if (passwordErr) {
    errors.password =
      stripValidationErrorCode(passwordErr) === 'Password is required'
        ? val('auth.password', PASSWORD_REQUIREMENTS_MESSAGE)
        : passwordErr;
  }
  const fnErr = validatePersonName(data.firstName, { required: true, label: 'First name' });
  if (fnErr) errors.firstName = fnErr;
  const lnErr = validatePersonName(data.lastName, { required: false, label: 'Last name' });
  if (lnErr) errors.lastName = lnErr;
  if (!data.role || !['student', 'employer', 'college_admin'].includes(data.role)) {
    errors.role = val('auth.role', 'Valid role is required');
  }

  if (data.role === 'student') {
    const key =
      typeof data.campusBindingToken === 'string'
        ? data.campusBindingToken.trim().replace(/\s+/g, '')
        : '';
    if (key.length < 15) {
      errors.campusBindingToken = val(
        'auth.campusBindingToken',
        'Campus enrollment key is too short — paste the full code from your placement office',
      );
    }
    const deptId = typeof data.departmentId === 'string' ? data.departmentId.trim() : '';
    const deptText = typeof data.department === 'string' ? data.department.trim() : '';
    if (!deptId && (!deptText || deptText.length < 2)) {
      errors.department = val('auth.department', 'Please select a department');
    }
    const byErr = validateBatchYear(data.batchYear, { required: true });
    if (byErr) errors.batchYear = byErr;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export const MAX_TITLE_LENGTH = 255;
export const MAX_FEEDBACK_TITLE_LENGTH = 500;

/** Letters, numbers, spaces, hyphens, underscores; must start and end with alphanumeric. */
export const TITLE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9\s_-]*[A-Za-z0-9])?$/;

export function normalizeTitle(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Returns an error message, or empty string when valid. */
export function validateTitle(
  title,
  { required = true, label = 'Title', minLength = 3, maxLength = MAX_TITLE_LENGTH } = {},
) {
  const prefix = (msg) => formatValidationError('common.title', msg);
  const s = normalizeTitle(title);
  if (!s) return required ? prefix(`${label} is required.`) : '';
  if (s.length < minLength) return prefix(`${label} must be at least ${minLength} characters`);
  if (s.length > maxLength) return prefix(`${label} must be ${maxLength} characters or fewer`);
  if (!TITLE_PATTERN.test(s)) {
    return prefix(`${label} may only contain letters, numbers, spaces, hyphens, and underscores`);
  }
  return '';
}

export function validateJobPosting(data) {
  const errors = {};

  const titleErr = validateTitle(data.title, { label: 'Job title' });
  if (titleErr) errors.title = titleErr;
  if (!data.job_type || !['full_time', 'internship', 'contract', 'ppo'].includes(data.job_type)) {
    errors.job_type = val('employer.jobType', 'Valid job type is required');
  }
  if (data.salary_min && data.salary_max && parseFloat(data.salary_min) > parseFloat(data.salary_max)) {
    errors.salary = val('employer.salaryRange', 'Minimum salary cannot exceed maximum salary');
  }
  if (data.min_cgpa && !validateCGPA(data.min_cgpa)) {
    errors.min_cgpa = val('employer.minCgpa', 'CGPA must be between 0 and 10');
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
