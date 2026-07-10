/** Display + template defaults (import falls back when cells are blank). */
export const CURRENT_ACADEMIC_YEAR = '2025-26';
export const CURRENT_SEMESTER = '6';

export const STUDENT_CSV_HEADERS = [
  'Academic Year',
  'Semester',
  'Name',
  'Roll',
  'Department',
  'Specialization',
  'Gender',
  'Disability Status',
  'Diversity Category',
  'Skills',
  'CGPA',
  'Job Status',
  'Internship Status',
  'Verified',
  'Photo URL',
];

const JOB = ['unplaced', 'placed', 'opted_out', 'higher_studies'];
const INTERN = ['none', 'ongoing', 'completed'];

function normKey(h) {
  return String(h ?? '').trim().toLowerCase();
}

/** Match import / roster rows by roll (trim + case-insensitive). */
export function normalizeStudentRollKey(roll) {
  return String(roll ?? '').trim().toLowerCase();
}

export function buildHeaderIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const k = normKey(h);
    if (k) idx[k] = i;
  });
  return idx;
}

export function validateStudentCsvHeaders(headers) {
  const idx = buildHeaderIndex(headers);
  const missing = STUDENT_CSV_HEADERS.filter((col) => idx[normKey(col)] === undefined);
  if (missing.length) {
    return { ok: false, error: `Missing columns: ${missing.join(', ')}` };
  }
  return { ok: true, idx };
}

function parseVerified(raw) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(v)) return true;
  if (['no', 'n', 'false', '0', ''].includes(v)) return false;
  return null;
}

export function normalizeJobStatus(raw) {
  let t = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (t === 'higherstudies') t = 'higher_studies';
  if (t === 'optedout') t = 'opted_out';
  if (JOB.includes(t)) return t;
  return null;
}

export function normalizeInternshipStatus(raw) {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (INTERN.includes(t)) return t;
  return null;
}

export function studentToCsvRow(s) {
  return STUDENT_CSV_HEADERS.map((h) => {
    if (h === 'Skills') return (s.skills || []).join('; ');
    if (h === 'Verified') return s.verified ? 'Yes' : 'No';
    if (h === 'CGPA') return String(s.cgpa ?? '');
    const map = {
      'Academic Year': s.academicYear,
      Semester: s.semester,
      Name: s.name,
      Roll: s.roll,
      Department: s.dept,
      Specialization: s.specialization,
      Gender: s.gender,
      'Disability Status': s.disabilityStatus,
      'Diversity Category': s.diversityCategory,
      'Job Status': s.jobStatus,
      'Internship Status': s.internshipStatus,
      'Photo URL': s.photo,
    };
    return String(map[h] ?? '');
  });
}

export function studentCsvTemplateExampleRow() {
  return [
    CURRENT_ACADEMIC_YEAR,
    CURRENT_SEMESTER,
    'Sample Student',
    'CS2021001',
    'Computer Science',
    'AI & ML',
    'Female',
    'None',
    'General',
    'Python; React',
    '8.50',
    'unplaced',
    'none',
    'No',
    'https://i.pravatar.cc/64?img=1',
  ];
}

/**
 * @param {string[]} cells
 * @param {Record<string, number>} idx — normalized header → column index
 * @param {number} line — 1-based data line in file (for errors)
 */
export function parseStudentRow(cells, idx, line) {
  const g = (name) => {
    const i = idx[normKey(name)];
    return i === undefined ? '' : String(cells[i] ?? '').trim();
  };

  const name = g('Name');
  const roll = g('Roll');
  if (!name) return { ok: false, error: `Line ${line}: Name is required` };
  if (!roll) return { ok: false, error: `Line ${line}: Roll is required` };

  const skillsRaw = g('Skills');
  const skills = skillsRaw
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const cgpaRaw = g('CGPA');
  let cgpa;
  if (cgpaRaw === '') {
    cgpa = 0;
  } else {
    cgpa = Number(cgpaRaw);
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      return { ok: false, error: `Line ${line}: CGPA must be a number from 0 to 10` };
    }
  }

  const verified = parseVerified(g('Verified'));
  if (verified === null) {
    return { ok: false, error: `Line ${line}: Verified must be Yes or No` };
  }

  const jobStatus = normalizeJobStatus(g('Job Status'));
  if (!jobStatus) {
    return {
      ok: false,
      error: `Line ${line}: Job Status must be one of: ${JOB.join(', ')}`,
    };
  }

  const internshipStatus = normalizeInternshipStatus(g('Internship Status'));
  if (!internshipStatus) {
    return {
      ok: false,
      error: `Line ${line}: Internship Status must be one of: ${INTERN.join(', ')}`,
    };
  }

  const semester = g('Semester');
  if (semester && !/^[1-8]$/.test(semester)) {
    return { ok: false, error: `Line ${line}: Semester must be 1–8` };
  }

  return {
    ok: true,
    student: {
      academicYear: g('Academic Year') || CURRENT_ACADEMIC_YEAR,
      semester: semester || CURRENT_SEMESTER,
      name,
      roll,
      dept: g('Department'),
      specialization: g('Specialization'),
      gender: g('Gender'),
      disabilityStatus: g('Disability Status') || 'None',
      diversityCategory: g('Diversity Category') || 'General',
      skills,
      cgpa,
      jobStatus,
      internshipStatus,
      verified,
      photo: g('Photo URL') || `https://i.pravatar.cc/64?u=${encodeURIComponent(roll)}`,
    },
  };
}
