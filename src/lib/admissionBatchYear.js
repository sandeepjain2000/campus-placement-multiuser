/**
 * Admission batch = calendar year of intake (YYYY only).
 * New batches open from May: until April, max batch = previous calendar year;
 * from 1 May, current calendar year is included.
 */

export const FIRST_ADMISSION_BATCH_YEAR = 2022;

/** Month index: May = 4 */
const BATCH_ROLLOVER_MONTH = 4;

export function getMaxAdmissionBatchYear(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= BATCH_ROLLOVER_MONTH ? year : year - 1;
}

/** Sequential years from first intake year through the latest allowed batch. */
export function listAdmissionBatchYears({
  date = new Date(),
  firstYear = FIRST_ADMISSION_BATCH_YEAR,
} = {}) {
  const max = getMaxAdmissionBatchYear(date);
  const start = Math.min(firstYear, max);
  const years = [];
  for (let y = start; y <= max; y += 1) years.push(y);
  return years;
}

export function parseAdmissionBatchYear(raw, { date = new Date() } = {}) {
  const text = String(raw ?? '').trim();
  if (!text) {
    return { ok: true, year: null, label: '' };
  }

  const span = text.match(/^(\d{4})-(\d{2})$/);
  if (span) {
    return validateAdmissionBatchYearNumber(Number(span[1]), { date });
  }

  const single = text.match(/^(\d{4})$/);
  if (single) {
    return validateAdmissionBatchYearNumber(Number(single[1]), { date });
  }

  return {
    ok: false,
    year: null,
    label: '',
    error: 'Batch must be a 4-digit year (e.g. 2024).',
  };
}

function validateAdmissionBatchYearNumber(year, { date }) {
  const min = FIRST_ADMISSION_BATCH_YEAR;
  const max = getMaxAdmissionBatchYear(date);
  if (!Number.isFinite(year) || year < min || year > max) {
    return {
      ok: false,
      year: null,
      label: '',
      error: `Batch must be between ${min} and ${max} (admissions from May).`,
    };
  }
  return { ok: true, year, label: String(year) };
}

export function normalizeAdmissionBatchLabel(raw) {
  const parsed = parseAdmissionBatchYear(raw);
  if (parsed.ok && parsed.label) return parsed.label;
  return String(raw ?? '').trim();
}

export function defaultAdmissionBatchYear(date = new Date()) {
  return String(getMaxAdmissionBatchYear(date));
}
