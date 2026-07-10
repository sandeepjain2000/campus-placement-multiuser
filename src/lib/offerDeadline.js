/**
 * Offer deadlines are often stored as DATE or midnight UTC timestamps.
 * Treat date-only values as valid through end of that calendar day (UTC) so students
 * are not locked out hours before the displayed deadline.
 */

/**
 * @param {string | Date | null | undefined} deadline
 * @returns {Date | null}
 */
export function parseOfferDeadline(deadline) {
  if (deadline == null || deadline === '') return null;
  if (deadline instanceof Date) {
    return Number.isNaN(deadline.getTime()) ? null : deadline;
  }
  const raw = String(deadline).trim();
  if (!raw) return null;

  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly && raw.length <= 10) {
    const end = new Date(`${dateOnly[1]}T23:59:59.999Z`);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string | Date | null | undefined} deadline
 * @param {Date} [now]
 */
export function isOfferDeadlinePassed(deadline, now = new Date()) {
  const end = parseOfferDeadline(deadline);
  if (!end) return false;
  return end.getTime() < now.getTime();
}
