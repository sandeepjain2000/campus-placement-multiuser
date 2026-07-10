const {
  daysUntilDriveDate,
  formatDriveVenueForStudent,
  getDriveVenueWarning,
  isDriveVenueUnconfirmed,
} = require('@/lib/driveVenueWarning');

describe('driveVenueWarning', () => {
  it('detects missing or placeholder venues', () => {
    expect(isDriveVenueUnconfirmed(null)).toBe(true);
    expect(isDriveVenueUnconfirmed('TBD')).toBe(true);
    expect(isDriveVenueUnconfirmed('Venue TBD')).toBe(true);
    expect(isDriveVenueUnconfirmed('Auditorium A')).toBe(false);
  });

  it('formats student venue label', () => {
    expect(formatDriveVenueForStudent('TBD')).toBe('Not listed yet');
    expect(formatDriveVenueForStudent('Block C')).toBe('Block C');
  });

  it('returns warning when venue is unconfirmed', () => {
    const warning = getDriveVenueWarning({ venue: 'TBD', driveDate: new Date() });
    expect(warning).toMatch(/not listed here yet/i);
    expect(warning).toMatch(/college email/i);
    expect(getDriveVenueWarning({ venue: 'Main hall', driveDate: new Date() })).toBeNull();
  });

  it('computes days until drive date', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    expect(daysUntilDriveDate(today)).toBe(0);
  });
});
