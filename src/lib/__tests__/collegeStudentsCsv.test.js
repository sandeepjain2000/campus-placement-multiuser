const {
  buildHeaderIndex,
  parseStudentRow,
  validateStudentCsvHeaders,
  validateStudentCsvRowNoBlanks,
  STUDENT_CSV_HEADERS,
  CURRENT_JOINING_BATCH,
  CURRENT_ADMISSION_YEAR,
  CURRENT_GRADUATION_YEAR,
  buildStudentsImportTemplateCsv,
  studentCsvTemplateExampleRow,
} = require('../collegeStudentsCsv');

function fullRow(overrides = {}) {
  const base = {
    'Academic Year': '2025-26',
    Semester: '6',
    Batch: String(CURRENT_JOINING_BATCH),
    'Admission Year': String(CURRENT_ADMISSION_YEAR),
    'Graduation Year': String(CURRENT_GRADUATION_YEAR),
    Name: 'Test Student',
    Roll: 'CS2021001',
    Email: 'test@example.com',
    Department: 'Computer Science',
    Specialization: 'CSE',
    Gender: 'Male',
    'Disability Status': 'None',
    'Diversity Category': 'General',
    Skills: 'Python',
    CGPA: '8.5',
    'Job Status': 'unplaced',
    'Internship Status': 'none',
    Verified: 'Yes',
    Sections: '3/6',
    'Photo URL': 'https://example.com/photo.jpg',
    Remarks: '',
  };
  const merged = { ...base, ...overrides };
  return STUDENT_CSV_HEADERS.map((h) => merged[h] ?? '');
}

describe('collegeStudentsCsv strict import', () => {
  it('accepts template headers including optional Remarks', () => {
    const check = validateStudentCsvHeaders(STUDENT_CSV_HEADERS);
    expect(check.ok).toBe(true);
  });

  it('rejects row with blank CGPA', () => {
    const idx = buildHeaderIndex(STUDENT_CSV_HEADERS);
    const cells = fullRow({ CGPA: '' });
    const blank = validateStudentCsvRowNoBlanks(cells, idx, 2);
    expect(blank.ok).toBe(false);
    expect(blank.error).toMatch(/CGPA/i);
    expect(blank.error).toMatch(/Remarks and Photo URL may be left blank/i);
  });

  it('allows blank Remarks when all other fields are filled', () => {
    const idx = buildHeaderIndex(STUDENT_CSV_HEADERS);
    const cells = fullRow({ Remarks: '' });
    const blank = validateStudentCsvRowNoBlanks(cells, idx, 2);
    expect(blank.ok).toBe(true);
    const parsed = parseStudentRow(cells, idx, 2);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    expect(parsed.student.importRemarks).toBe('');
  });

  it('allows blank Photo URL and does not import a photo URL', () => {
    const idx = buildHeaderIndex(STUDENT_CSV_HEADERS);
    const cells = fullRow({ 'Photo URL': '' });
    const blank = validateStudentCsvRowNoBlanks(cells, idx, 2);
    expect(blank.ok).toBe(true);
    const parsed = parseStudentRow(cells, idx, 2);
    expect(parsed.ok).toBe(true);
    expect(parsed.student.photo).toBeNull();
  });

  it('rejects blank Department', () => {
    const idx = buildHeaderIndex(STUDENT_CSV_HEADERS);
    const cells = fullRow({ Department: '   ' });
    const parsed = parseStudentRow(cells, idx, 2);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/Department/i);
  });

  it('builds import template with same headers as export and one example row', () => {
    const csv = buildStudentsImportTemplateCsv();
    const lines = csv.split('\n');
    expect(lines[0]).toBe(STUDENT_CSV_HEADERS.join(','));
    expect(studentCsvTemplateExampleRow()).toHaveLength(STUDENT_CSV_HEADERS.length);
    expect(lines[1].split(',').length).toBeGreaterThanOrEqual(STUDENT_CSV_HEADERS.length - 2);
    expect(csv).toContain('Sample Student');
  });
});

