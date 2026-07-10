/**
 * Profile fields maintained by the college (initial enrollment + rollover).
 * Students must not edit these via self-service profile APIs.
 */

export const COLLEGE_CONTROLLED_AUX_KEYS = [
  'batchLabel',
  'joiningAcademicYear',
  'academicYearLabel',
  'semester',
  'degreePursued',
  'degree_pursued',
  'academicProgramCode',
  'academicProgramDisplay',
  'eligibilityGroupCode',
  'eligibilityGroupName',
  'internshipStatus',
  'disabilityStatus',
];

const CONTROLLED_MESSAGE =
  'This field is set by your placement office and cannot be changed here.';

function numOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(value) {
  const s = String(value ?? '').trim();
  return s || null;
}

/** Human-readable degree / program label for student profile display. */
export function resolveStudentDegreeLabel(profile = {}) {
  const degree = strOrNull(profile.degreePursued || profile.degree_pursued);
  if (degree) return degree;
  const branch = strOrNull(profile.branch);
  const dept = strOrNull(profile.department);
  if (branch && dept && branch.toLowerCase() !== dept.toLowerCase()) {
    return `${dept} — ${branch}`;
  }
  return branch || dept || '—';
}

/** Human-readable batch label. */
export function resolveStudentBatchLabel(profile = {}) {
  const batch = strOrNull(profile.batch || profile.joiningAcademicYear);
  if (batch) return batch;
  const by = profile.batchYear;
  if (by !== '' && by != null && Number.isFinite(Number(by))) return String(by);
  return '—';
}

/**
 * Reject when the request body tries to change college-controlled columns.
 * @returns {string|null} error message
 */
export function checkStudentCollegeFieldViolations(body, existing) {
  if (!body || typeof body !== 'object' || !existing) return null;

  const checks = [
    ['CGPA', body.cgpa, existing.cgpa, (a, b) => numOrNull(a) !== numOrNull(b)],
    ['Department', body.department, existing.department, (a, b) => strOrNull(a) !== strOrNull(b)],
    ['Branch', body.branch, existing.branch, (a, b) => strOrNull(a) !== strOrNull(b)],
    ['Batch year', body.batchYear ?? body.batch_year, existing.batch_year, (a, b) => numOrNull(a) !== numOrNull(b)],
    [
      'Graduation year',
      body.graduationYear ?? body.graduation_year,
      existing.graduation_year,
      (a, b) => numOrNull(a) !== numOrNull(b),
    ],
    [
      'Batch',
      body.batch ?? body.joiningAcademicYear ?? body.joining_academic_year,
      existing.joining_academic_year,
      (a, b) => strOrNull(a) !== strOrNull(b),
    ],
  ];

  for (const [label, incoming, stored, differs] of checks) {
    if (
      incoming !== undefined &&
      incoming !== null &&
      incoming !== '' &&
      differs(incoming, stored)
    ) {
      return `${label} ${CONTROLLED_MESSAGE}`;
    }
  }

  return null;
}

/** Force DB update parts to keep college-controlled column values. */
export function applyCollegeControlledProfileFields(parts, existing) {
  if (!parts || !existing) return parts;
  return {
    ...parts,
    department: existing.department ?? parts.department,
    branch: existing.branch ?? parts.branch,
    batch_year: existing.batch_year ?? parts.batch_year,
    graduation_year: existing.graduation_year ?? parts.graduation_year,
    cgpa: existing.cgpa ?? parts.cgpa,
  };
}

/** Merge aux_profile without dropping college-maintained keys. */
export function mergeStudentAuxProfilePreservingCollegeFields(existingAux, incomingAux) {
  const base =
    existingAux && typeof existingAux === 'object' && !Array.isArray(existingAux) ? existingAux : {};
  const incoming =
    incomingAux && typeof incomingAux === 'object' && !Array.isArray(incomingAux) ? incomingAux : {};
  const preserved = {};
  for (const key of COLLEGE_CONTROLLED_AUX_KEYS) {
    if (base[key] !== undefined && base[key] !== null && base[key] !== '') {
      preserved[key] = base[key];
    }
  }
  return { ...base, ...incoming, ...preserved };
}

export { CONTROLLED_MESSAGE as COLLEGE_CONTROLLED_FIELD_HINT };
