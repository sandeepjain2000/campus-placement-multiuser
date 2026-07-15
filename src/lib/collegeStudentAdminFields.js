import {
  CURRENT_ACADEMIC_YEAR,
  CURRENT_SEMESTER,
  CURRENT_GRADUATION_YEAR,
  normalizeInternshipStatus,
  normalizeJobStatus,
} from '@/lib/collegeStudentsCsv';
import { defaultAdmissionBatchYear } from '@/lib/admissionBatchYear';
import {
  validateStudentCgpa,
  parseStudentCgpaOrNull,
  parseStudentPercentageOrNull,
  parseStudentFullName,
  resolveStudentRollNumber,
  getEmailValidationError,
  getPhoneValidationError,
  validateURL,
} from '@/lib/validators';
import { parseJoiningBatch, reconcileBatchFields } from '@/lib/studentBatch';
import { validateFieldOrError, FIELD_IDS, validateStudentBacklogPair } from '@/lib/inputConstraints';
import { formatValidationError } from '@/lib/validationErrorCode';

function val(fieldId, message) {
  return formatValidationError(fieldId, message);
}

export const ADD_STUDENT_DEPARTMENTS = [
  'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering',
  'Biotechnology', 'Mathematics', 'Physics', 'Data Science',
  'Information Technology', 'Electronics & Communication', 'Other',
];

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
export const DISABILITY_OPTIONS = ['None', 'Locomotor', 'Visual', 'Hearing', 'Speech', 'Learning', 'Other'];
export const PLACEMENT_STATUSES = [
  { value: 'unplaced', label: 'Unplaced' },
  { value: 'placed', label: 'Placed' },
  { value: 'opted_out', label: 'Opted Out' },
  { value: 'higher_studies', label: 'Higher Studies' },
];
export const INTERNSHIP_STATUSES = [
  { value: 'none', label: 'None' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];
export const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function initialCollegeStudentForm() {
  return {
    name: '',
    email: '',
    communication_email: '',
    phone: '',
    roll_number: '',
    enrollment_number: '',
    photo_url: '',
    academic_year: CURRENT_ACADEMIC_YEAR,
    semester: CURRENT_SEMESTER,
    department: '',
    branch: '',
    degree_pursued: '',
    academic_program_code: '',
    eligibility_group_code: '',
    eligibility_group_name: '',
    academic_program_display: '',
    batch: defaultAdmissionBatchYear(),
    batch_year: defaultAdmissionBatchYear(),
    graduation_year: CURRENT_GRADUATION_YEAR,
    cgpa: '8',
    tenth_percentage: '',
    twelfth_percentage: '',
    diploma_percentage: '',
    backlogs_active: '0',
    backlogs_history: '0',
    gender: '',
    category: 'General',
    disability_status: 'None',
    date_of_birth: '',
    placement_status: 'unplaced',
    internship_status: 'none',
    verified: true,
    skills: [],
    bio: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    resume_url: '',
    expected_salary_min: '',
    expected_salary_max: '',
    preferred_locations: [],
    willing_to_relocate: true,
  };
}

function parseOptionalPercent(raw, label) {
  return parseStudentPercentageOrNull(raw, label);
}

function parseOptionalInt(raw, label, { min = 0, max = 999, fieldId = 'student.percent' } = {}) {
  const s = String(raw ?? '').trim();
  if (!s) return { value: null };
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || n < min || n > max) {
    return { error: val(fieldId, `${label} must be between ${min} and ${max}.`) };
  }
  return { value: n };
}

function parseOptionalSalary(raw, label, fieldId = FIELD_IDS.STUDENT_SALARY_MIN) {
  const s = String(raw ?? '').trim();
  if (!s) return { value: null };
  const n = Number(s);
  if (Number.isNaN(n) || n < 0) return { error: val(fieldId, `${label} must be a positive number.`) };
  return { value: n };
}

function parseOptionalUrl(raw, label, fieldId) {
  const s = String(raw ?? '').trim();
  if (!s) return { value: null };
  if (!validateURL(s)) return { error: val(fieldId, `${label} must be a valid URL.`) };
  return { value: s };
}

/**
 * Profile photos are set only via file upload APIs — never by pasting a URL.
 * Kept for form display of the already-uploaded avatar; ignored on write.
 */
function parsePhotoUrl(_raw) {
  return { value: null };
}

export function buildAuxProfileFromForm(form, existingAux = {}) {
  const base = existingAux && typeof existingAux === 'object' && !Array.isArray(existingAux) ? existingAux : {};
  return {
    ...base,
    degreePursued: String(form.degree_pursued || '').trim() || base.degreePursued || '',
    joiningAcademicYear:
      String(form.batch || '').trim() ||
      base.joiningAcademicYear ||
      base.batchLabel ||
      '',
    batchLabel:
      String(form.batch || '').trim() ||
      base.batchLabel ||
      base.joiningAcademicYear ||
      '',
    academicYearLabel: String(form.academic_year || '').trim() || base.academicYearLabel || '',
    semester: String(form.semester || '').trim() || base.semester || '',
    disabilityStatus: String(form.disability_status || 'None').trim() || base.disabilityStatus || 'None',
    internshipStatus: normalizeInternshipStatus(form.internship_status) || base.internshipStatus || 'none',
    academicProgramCode: String(form.academic_program_code || '').trim() || base.academicProgramCode || '',
    eligibilityGroupCode: String(form.eligibility_group_code || '').trim() || base.eligibilityGroupCode || '',
    eligibilityGroupName: String(form.eligibility_group_name || '').trim() || base.eligibilityGroupName || '',
    academicProgramDisplay: String(form.academic_program_display || '').trim() || base.academicProgramDisplay || '',
  };
}

/**
 * Validate add-form payload. For edit, skip identity checks when isEdit=true.
 */
export function validateCollegeStudentForm(form, { isEdit = false, collegeShortCode = '' } = {}) {
  const errors = {};

  if (!isEdit) {
    if (!form.name?.trim()) errors.name = val('student.name', 'Name is required.');
    const emailErr = getEmailValidationError(form.email, { required: true });
    if (emailErr) errors.email = emailErr;
    const rollErr = resolveStudentRollNumber(form.roll_number, collegeShortCode);
    if (rollErr.error) errors.roll_number = rollErr.error;
  }

  const commErr = getEmailValidationError(form.communication_email, { required: false });
  if (commErr) {
    errors.communication_email = val('student.commEmail', 'Invalid communication email.');
  }

  const phoneErr = getPhoneValidationError(form.phone, { required: false });
  if (phoneErr) errors.phone = phoneErr;

  if (!form.academic_program_code?.trim() && !form.department?.trim()) {
    errors.department = val('student.program', 'Select an academic program or department.');
  }

  const cgpaErr = validateStudentCgpa(form.cgpa);
  if (cgpaErr) errors.cgpa = cgpaErr;

  const semester = String(form.semester || '').trim();
  if (semester && !SEMESTER_OPTIONS.includes(semester)) {
    errors.semester = val('student.semester', 'Semester must be 1–8.');
  }

  const job = normalizeJobStatus(form.placement_status);
  if (!job) errors.placement_status = val('student.placementStatus', 'Invalid placement status.');

  const intern = normalizeInternshipStatus(form.internship_status);
  if (!intern) errors.internship_status = val('student.internshipStatus', 'Invalid internship status.');

  const percentFields = [
    ['tenth_percentage', FIELD_IDS.STUDENT_PERCENT, 'Class X %'],
    ['twelfth_percentage', FIELD_IDS.STUDENT_PERCENT, 'Class XII %'],
    ['diploma_percentage', FIELD_IDS.STUDENT_PERCENT, 'Diploma %'],
  ];
  for (const [key, fieldId, label] of percentFields) {
    const e = validateFieldOrError(fieldId, form[key], { label });
    if (e) errors[key] = e;
  }

  const backlogFields = [
    ['backlogs_active', FIELD_IDS.STUDENT_BACKLOGS_ACTIVE],
    ['backlogs_history', FIELD_IDS.STUDENT_BACKLOGS_TOTAL],
  ];
  for (const [key, fieldId] of backlogFields) {
    const e = validateFieldOrError(fieldId, form[key]);
    if (e) errors[key] = e;
  }
  const backlogPairErr = validateStudentBacklogPair(form.backlogs_active, form.backlogs_history);
  if (backlogPairErr && !errors.backlogs_active && !errors.backlogs_history) {
    errors.backlogs_active = backlogPairErr;
  }

  const batchErr = validateFieldOrError(FIELD_IDS.STUDENT_BATCH_YEAR, form.batch_year);
  if (batchErr) errors.batch_year = batchErr;
  const gradErr = validateFieldOrError(FIELD_IDS.STUDENT_GRAD_YEAR, form.graduation_year, {
    batchYear: form.batch_year,
  });
  if (gradErr) errors.graduation_year = gradErr;

  const dobErr = validateFieldOrError(FIELD_IDS.STUDENT_DOB, form.date_of_birth);
  if (dobErr) errors.date_of_birth = dobErr;

  const batchText = String(form.batch || '').trim();
  if (!batchText) {
    errors.batch = val(FIELD_IDS.STUDENT_BATCH_YEAR, 'Batch year is required.');
  } else {
    const parsed = parseJoiningBatch(batchText);
    if (!parsed.ok) errors.batch = val(FIELD_IDS.STUDENT_BATCH_YEAR, parsed.error);
  }

  const by = form.batch_year ? parseInt(String(form.batch_year), 10) : null;
  const gy = form.graduation_year ? parseInt(String(form.graduation_year), 10) : null;
  if (by && gy && gy < by) {
    errors.graduation_year = val(
      FIELD_IDS.STUDENT_GRAD_YEAR,
      'Graduation year must be on or after admission year.',
    );
  }

  const salMinErr = validateFieldOrError(FIELD_IDS.STUDENT_SALARY_MIN, form.expected_salary_min);
  if (salMinErr) errors.expected_salary_min = salMinErr;
  const salMaxErr = validateFieldOrError(FIELD_IDS.STUDENT_SALARY_MAX, form.expected_salary_max, {
    salaryMin: form.expected_salary_min,
  });
  if (salMaxErr) errors.expected_salary_max = salMaxErr;

  for (const [key, label, fieldId] of [
    ['linkedin_url', 'LinkedIn', 'student.linkedin'],
    ['github_url', 'GitHub', 'student.github'],
    ['portfolio_url', 'Portfolio', 'student.portfolio'],
    ['resume_url', 'Resume URL', 'student.resumeUrl'],
  ]) {
    const r = parseOptionalUrl(form[key], label, fieldId);
    if (r.error) errors[key] = r.error;
  }

  return { errors, valid: Object.keys(errors).length === 0 };
}

/**
 * Parse request body into DB-ready fragments (after validateCollegeStudentForm).
 */
export function parseCollegeStudentAdminPayload(body, { isEdit = false, collegeShortCode = '' } = {}) {
  const form = { ...initialCollegeStudentForm(), ...body };
  const { errors, valid } = validateCollegeStudentForm(form, { isEdit, collegeShortCode });
  if (!valid) {
    return { error: Object.values(errors)[0], errors };
  }

  let identity = null;
  if (!isEdit) {
    const nameParsed = parseStudentFullName(form.name);
    if (nameParsed.error) return { error: nameParsed.error };
    const rollResolved = resolveStudentRollNumber(form.roll_number, collegeShortCode);
    if (rollResolved.error) return { error: rollResolved.error };
    identity = {
      firstName: nameParsed.firstName,
      lastName: nameParsed.lastName,
      fullName: nameParsed.fullName,
      email: form.email.toLowerCase().trim(),
      rollNumber: rollResolved.rollNumber,
      systemId: rollResolved.systemId,
    };
  }

  const cgpaParsed = parseStudentCgpaOrNull(form.cgpa);
  if (cgpaParsed.error) return { error: cgpaParsed.error };

  const tenth = parseOptionalPercent(form.tenth_percentage, 'Class X');
  const twelfth = parseOptionalPercent(form.twelfth_percentage, 'Class XII');
  const diploma = parseOptionalPercent(form.diploma_percentage, 'Diploma');
  const backActive = parseOptionalInt(form.backlogs_active, 'Active backlogs', { min: 0, max: 99 });
  const backHistory = parseOptionalInt(form.backlogs_history, 'Total backlogs', { min: 0, max: 99 });
  const batchYear = parseOptionalInt(form.batch_year, 'Admission year', { min: 1990, max: 2040 });
  const gradYear = parseOptionalInt(form.graduation_year, 'Graduation year', { min: 1990, max: 2040 });
  const batchReconciled = reconcileBatchFields({
    batch: form.batch,
    batch_year: batchYear.value,
    graduation_year: gradYear.value,
  });
  if (batchReconciled.error) {
    return { error: batchReconciled.error };
  }
  const salMin = parseOptionalSalary(form.expected_salary_min, 'Min salary');
  const salMax = parseOptionalSalary(form.expected_salary_max, 'Max salary');

  const semesterParsed = parseOptionalInt(form.semester, 'Semester', { min: 1, max: 24 });

  return {
    identity,
    profile: {
      department: form.department.trim(),
      branch: form.branch?.trim() || null,
      cgpa: cgpaParsed.value ?? 8,
      gender: form.gender?.trim() || null,
      category: form.category?.trim() || 'General',
      placement_status: normalizeJobStatus(form.placement_status) || 'unplaced',
      is_verified: Boolean(form.verified),
      enrollment_number: form.enrollment_number?.trim() || null,
      batch_year: batchReconciled.batchYear,
      graduation_year: batchReconciled.graduationYear,
      joining_academic_year: batchReconciled.joiningAcademicYear || null,
      semester_number: semesterParsed.value,
      program_duration_years: 4,
      tenth_percentage: tenth.value,
      twelfth_percentage: twelfth.value,
      diploma_percentage: diploma.value,
      backlogs_active: backActive.value ?? 0,
      backlogs_history: backHistory.value ?? 0,
      date_of_birth: form.date_of_birth?.trim() || null,
      bio: form.bio?.trim() || null,
      linkedin_url: parseOptionalUrl(form.linkedin_url, 'LinkedIn', 'student.linkedin').value,
      github_url: parseOptionalUrl(form.github_url, 'GitHub', 'student.github').value,
      portfolio_url: parseOptionalUrl(form.portfolio_url, 'Portfolio', 'student.portfolio').value,
      resume_url: parseOptionalUrl(form.resume_url, 'Resume URL', 'student.resumeUrl').value,
      expected_salary_min: salMin.value,
      expected_salary_max: salMax.value,
      preferred_locations: Array.isArray(form.preferred_locations)
        ? form.preferred_locations.filter(Boolean)
        : [],
      willing_to_relocate: Boolean(form.willing_to_relocate),
    },
    user: {
      phone: form.phone?.trim() || null,
      communication_email: form.communication_email?.trim() || null,
      // Avatar is written only by /api/college/students/[id]/avatar/upload
      avatar_url: parsePhotoUrl(form.photo_url).value,
    },
    auxProfile: buildAuxProfileFromForm({
      ...form,
      batch: batchReconciled.joiningAcademicYear || batchReconciled.batchLabel,
    }),
    skills: Array.isArray(form.skills) ? form.skills.filter(Boolean) : [],
  };
}
