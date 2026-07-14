const {
  DEFAULT_COLLEGE_DRIVE_STATUS_TAB,
  driveMatchesStatusTab,
  filterDrivesByStatusTab,
  countDrivesByStatusTab,
} = require('@/lib/collegeDriveStatusTabs');

describe('collegeDriveStatusTabs', () => {
  const drives = [
    { id: '1', status: 'requested' },
    { id: '2', status: 'requested' },
    { id: '3', status: 'approved' },
    { id: '4', status: 'scheduled' },
    { id: '5', status: 'completed' },
    { id: '6', status: 'cancelled' },
  ];

  it('defaults to unapproved', () => {
    expect(DEFAULT_COLLEGE_DRIVE_STATUS_TAB).toBe('unapproved');
  });

  it('filters unapproved (requested) drives', () => {
    expect(filterDrivesByStatusTab(drives, 'unapproved')).toHaveLength(2);
    expect(driveMatchesStatusTab('approved', 'unapproved')).toBe(false);
  });

  it('groups approved/scheduled/in_progress as active', () => {
    expect(filterDrivesByStatusTab(drives, 'active').map((d) => d.id)).toEqual(['3', '4']);
  });

  it('treats cancelled as rejected tab', () => {
    expect(filterDrivesByStatusTab(drives, 'rejected')).toHaveLength(1);
  });

  it('counts each tab including all', () => {
    expect(countDrivesByStatusTab(drives)).toEqual({
      unapproved: 2,
      active: 2,
      completed: 1,
      rejected: 1,
      all: 6,
    });
  });
});
