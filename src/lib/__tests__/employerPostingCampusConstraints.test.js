const {
  campusesEligibleForPosting,
  filterTenantIdsByConstraint,
  getConstraintAllowlist,
  jobTypeToConstraintCategory,
  normalizePostingCampusConstraints,
  validateCategoryConstraintInput,
} = require('@/lib/employerPostingCampusConstraints');

describe('employerPostingCampusConstraints', () => {
  it('maps job types to constraint categories', () => {
    expect(jobTypeToConstraintCategory('internship')).toBe('internship');
    expect(jobTypeToConstraintCategory('hackathon')).toBe('projects');
    expect(jobTypeToConstraintCategory('full_time')).toBe('alumni_jobs');
  });

  it('treats empty category list as unrestricted', () => {
    const constraints = normalizePostingCampusConstraints({ internship: [] });
    expect(getConstraintAllowlist(constraints, 'internship')).toBeNull();
  });

  it('filters campuses and tenant ids by allowlist', () => {
    const constraints = { internship: ['a', 'b'] };
    const campuses = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(campusesEligibleForPosting(campuses, constraints, 'internship')).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
    expect(filterTenantIdsByConstraint(['a', 'c'], getConstraintAllowlist(constraints, 'internship'))).toEqual([
      'a',
    ]);
  });

  it('rejects unapproved tenant ids on save', () => {
    const approved = new Set(['a']);
    const result = validateCategoryConstraintInput({}, 'internship', ['a', 'b'], approved);
    expect(result.ok).toBe(false);
  });
});
