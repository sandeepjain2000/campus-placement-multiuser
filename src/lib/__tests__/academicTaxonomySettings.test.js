const { parseCollegeTaxonomySettings } = require('../academicTaxonomy/tenantSettings');

describe('parseCollegeTaxonomySettings', () => {
  it('defaults to engineering profile', () => {
    const s = parseCollegeTaxonomySettings({});
    expect(s.institutionProfile).toBe('engineering');
    expect(s.usePlatformDefaults).toBe(true);
    expect(s.defaultDegreeCode).toBe('btech');
    expect(s.defaultProgramCode).toBe('btech_cse');
    expect(s.defaultEligibilityGroupCodes).toContain('computer_science');
  });

  it('parses general profile', () => {
    const s = parseCollegeTaxonomySettings({ institutionProfile: 'general' });
    expect(s.institutionProfile).toBe('general');
    expect(s.restrictProgramsToDefaults).toBe(false);
  });
});
