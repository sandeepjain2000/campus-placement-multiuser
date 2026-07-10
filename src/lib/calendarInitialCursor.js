/**
 * Pick calendar month/year so the grid opens on data students care about.
 * `initialMonth` is 0-based (JavaScript Date month), matching CampusCalendarGrid.
 *
 * @param {readonly (string | null | undefined)[]} dateStrings ISO date prefixes YYYY-MM-DD
 * @returns {{ initialYear: number, initialMonth: number }}
 */
export function getInitialCalendarCursorFromIsoDates(dateStrings) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const sorted = [
    ...new Set(
      (dateStrings || [])
        .filter(Boolean)
        .map((s) => String(s).slice(0, 10))
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
    ),
  ].sort();
  if (sorted.length === 0) {
    return { initialYear: now.getFullYear(), initialMonth: now.getMonth() };
  }
  const pick = sorted.find((d) => d >= todayYmd) || sorted[sorted.length - 1];
  const [y, mo] = pick.split('-').map(Number);
  return { initialYear: y, initialMonth: mo - 1 };
}
