export function getCurrentAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

export function getAcademicYearOptions(centerYear, count = 3) {
  const [startStr] = centerYear.split('-');
  const centerStart = Number(startStr);
  if (!Number.isFinite(centerStart)) return [centerYear];
  const radius = Math.floor(count / 2);
  const out = [];
  for (let i = centerStart - radius; i <= centerStart + radius; i++) {
    const endYearShort = String((i + 1) % 100).padStart(2, '0');
    out.push(`${i}-${endYearShort}`);
  }
  return out;
}
