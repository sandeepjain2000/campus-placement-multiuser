const { validateStudentBacklogPair } = require('../inputConstraints');

describe('validateStudentBacklogPair', () => {
  it('allows active backlogs equal to total', () => {
    expect(validateStudentBacklogPair(3, 3)).toBeNull();
  });

  it('allows active backlogs less than total', () => {
    expect(validateStudentBacklogPair(2, 5)).toBeNull();
  });

  it('rejects active backlogs greater than total', () => {
    expect(validateStudentBacklogPair(5, 3)).toMatch(/cannot exceed total backlogs/i);
  });
});
