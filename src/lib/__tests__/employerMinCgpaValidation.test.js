const {
  validateEmployerJobPayload,
  EMPLOYER_STIPEND_JOB_TYPES,
  employerCompensationFieldIds,
} = require('@/lib/apiInputValidation');
const { FIELD_IDS } = require('@/lib/inputConstraints');
const {
  DEFAULT_EMPLOYER_MIN_CGPA,
  normalizeEmployerMinCgpa,
  resolveEmployerMinCgpaForSubmit,
} = require('@/lib/employerJobDisplay');
const { validateAndResolveEmployerJobSubmit } = require('@/lib/employerJobSubmitValidation');

describe('employer min CGPA validation', () => {
  const base = {
    salaryMin: null,
    salaryMax: null,
    vacancies: 1,
    jobType: 'internship',
  };

  it('coerces CGPA of 0 to default floor on create payload', () => {
    expect(validateEmployerJobPayload({ ...base, minCgpa: 0 })).toBeNull();
    expect(validateEmployerJobPayload({ ...base, minCgpa: '0' })).toBeNull();
  });

  it('allows empty min CGPA (optional field)', () => {
    expect(validateEmployerJobPayload({ ...base, minCgpa: '' })).toBeNull();
    expect(validateEmployerJobPayload({ ...base, minCgpa: null })).toBeNull();
  });

  it('resolveEmployerMinCgpaForSubmit stores default for 0', () => {
    const zero = resolveEmployerMinCgpaForSubmit(0);
    expect(zero.error).toBeNull();
    expect(zero.value).toBe(DEFAULT_EMPLOYER_MIN_CGPA);

    const valid = resolveEmployerMinCgpaForSubmit('7.5');
    expect(valid.error).toBeNull();
    expect(valid.value).toBe(7.5);
  });

  it('normalizeEmployerMinCgpa maps zero to default and keeps empty as null', () => {
    expect(normalizeEmployerMinCgpa(0)).toBe(DEFAULT_EMPLOYER_MIN_CGPA);
    expect(normalizeEmployerMinCgpa('0')).toBe(DEFAULT_EMPLOYER_MIN_CGPA);
    expect(normalizeEmployerMinCgpa(null)).toBeNull();
    expect(normalizeEmployerMinCgpa('')).toBeNull();
    expect(normalizeEmployerMinCgpa(7)).toBe(7);
  });

  it('uses stipend field rules for program job types (create and edit parity)', () => {
    for (const jobType of ['internship', 'short_project', 'hackathon']) {
      expect(EMPLOYER_STIPEND_JOB_TYPES.has(jobType)).toBe(true);
      const { minId, maxId } = employerCompensationFieldIds(jobType);
      expect(minId).toBe(FIELD_IDS.EMPLOYER_STIPEND_MIN);
      expect(maxId).toBe(FIELD_IDS.EMPLOYER_STIPEND_MAX);
    }
    const fullTime = employerCompensationFieldIds('full_time');
    expect(fullTime.minId).toBe(FIELD_IDS.EMPLOYER_SALARY_MIN);
    expect(fullTime.maxId).toBe(FIELD_IDS.EMPLOYER_SALARY_MAX);
  });

  it('validateAndResolveEmployerJobSubmit coerces zero like API and edit flows', () => {
    const coerced = validateAndResolveEmployerJobSubmit({
      ...base,
      minCgpa: 0,
      jobType: 'short_project',
    });
    expect(coerced.error).toBeNull();
    expect(coerced.minCgpa).toBe(DEFAULT_EMPLOYER_MIN_CGPA);

    const good = validateAndResolveEmployerJobSubmit({
      ...base,
      minCgpa: '8',
      jobType: 'hackathon',
    });
    expect(good.error).toBeNull();
    expect(good.minCgpa).toBe(8);
  });
});
