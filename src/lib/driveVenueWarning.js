/**
 * Drive venue is optional — external email/calendar may carry the final location.
 * Surface a non-blocking warning when the portal has no confirmed venue yet.
 */

export function isDriveVenueUnconfirmed(venue) {
  const v = String(venue ?? '').trim();
  if (!v) return true;
  if (/^tbd$/i.test(v)) return true;
  if (/^venue\s+tbd$/i.test(v)) return true;
  return false;
}

export function formatDriveVenueForStudent(venue) {
  if (isDriveVenueUnconfirmed(venue)) return 'Not listed yet';
  return String(venue).trim();
}

/** @param {string | Date | null | undefined} driveDate */
export function daysUntilDriveDate(driveDate) {
  if (driveDate == null || driveDate === '') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(driveDate);
  if (Number.isNaN(event.getTime())) return null;
  event.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * @param {{ venue?: string | null, driveDate?: string | Date | null }} opts
 * @returns {string | null} warning copy, or null when venue is confirmed
 */
export function getDriveVenueWarning({ venue, driveDate } = {}) {
  if (!isDriveVenueUnconfirmed(venue)) return null;

  const days = daysUntilDriveDate(driveDate);
  const externalHint =
    'Check college email, calendar invites, or your placement office — the venue may be shared outside this portal.';

  if (days === 0) {
    return `Venue is not listed here yet. ${externalHint}`;
  }
  if (days === 1) {
    return `Venue is not listed here yet. ${externalHint}`;
  }
  if (days != null && days > 1 && days <= 7) {
    return `Venue is not listed here yet. ${externalHint}`;
  }
  return `Venue is not listed here yet. ${externalHint}`;
}
