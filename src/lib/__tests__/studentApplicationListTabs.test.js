const {
  applicationStatusCounts,
  filterApplicationsByStatusTab,
  normalizeAppStatus,
  studentApplicationStageLabel,
} = require('@/lib/studentApplicationListTabs');

describe('studentApplicationListTabs', () => {
  const apps = [
    { id: '1', status: 'shortlisted' },
    { id: '2', status: 'withdrawn' },
    { id: '3', status: 'rejected' },
    { id: '4', status: 'applied' },
  ];

  it('counts applied as all submissions', () => {
    expect(applicationStatusCounts(apps)).toEqual({
      all: 4,
      applied: 4,
      shortlisted: 1,
      selected: 0,
      rejected: 1,
      withdrawn: 1,
    });
  });

  it('applied tab shows every submission', () => {
    expect(filterApplicationsByStatusTab(apps, 'applied')).toHaveLength(4);
    expect(filterApplicationsByStatusTab(apps, 'shortlisted')).toHaveLength(1);
    expect(filterApplicationsByStatusTab(apps, '')).toHaveLength(4);
  });

  it('stage label never shows pending review for withdrawn applications', () => {
    expect(
      studentApplicationStageLabel({ status: 'withdrawn', currentRound: 0 }),
    ).toBe('Withdrawn');
    expect(
      studentApplicationStageLabel({ status: 'withdrawn', currentRound: 2 }),
    ).toBe('Withdrawn');
    expect(
      studentApplicationStageLabel({ status: 'applied', currentRound: 0 }),
    ).toBe('Pending review');
    expect(
      studentApplicationStageLabel({ status: 'shortlisted', currentRound: 0 }),
    ).toBe('Shortlisted');
  });
});
