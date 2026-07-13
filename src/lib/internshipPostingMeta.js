/**
 * Employer internship posting metadata (specializations + dates in additional_info JSON fallback).
 */

export function parseCommaList(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatCommaList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.join(', ');
}

/** Normalize API/DB date to YYYY-MM-DD or null. */
export function resolveInternshipDateInput(value) {
  if (value === '' || value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** @param {string | null | undefined} startDate @param {string | null | undefined} endDate */
export function computeInternshipDurationMonths(startDate, endDate) {
  const start = resolveInternshipDateInput(startDate);
  const end = resolveInternshipDateInput(endDate);
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (e < s) return null;
  const months =
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
  return Math.max(1, months);
}

/**
 * Field-level internship date validation.
 * @returns {{ fieldErrors: Record<string, string>, formError: string | null }}
 */
export function validateInternshipDateFields(startDate, endDate, options = {}) {
  const { required = false } = options;
  const fieldErrors = {};
  const start = resolveInternshipDateInput(startDate);
  const end = resolveInternshipDateInput(endDate);

  if (!start && !end) {
    if (required) {
      fieldErrors.startDate = 'Internship start date is required.';
      fieldErrors.endDate = 'Internship end date is required.';
    }
  } else if (!start) {
    fieldErrors.startDate = 'Internship start date is required.';
  } else if (!end) {
    fieldErrors.endDate = 'Internship end date is required.';
  } else if (end < start) {
    fieldErrors.endDate = 'Internship end date must be on or after the start date.';
  }

  const messages = Object.values(fieldErrors);
  const formError = messages.length === 1 ? messages[0] : messages.length > 1 ? messages.join(' ') : null;
  return { fieldErrors, formError };
}

/**
 * @param {string | null | undefined} startDate
 * @param {string | null | undefined} endDate
 * @param {{ required?: boolean }} [options]
 * @returns {string | null}
 */
export function validateInternshipDatesForSubmit(startDate, endDate, options = {}) {
  return validateInternshipDateFields(startDate, endDate, options).formError;
}

/** @param {string | null | undefined} startDate @param {string | null | undefined} endDate */
export function formatInternshipPeriodLabel(startDate, endDate, formatDateFn) {
  const start = resolveInternshipDateInput(startDate);
  const end = resolveInternshipDateInput(endDate);
  if (!start && !end) return '';
  if (start && end) {
    const left = formatDateFn ? formatDateFn(start) : start;
    const right = formatDateFn ? formatDateFn(end) : end;
    return `${left} – ${right}`;
  }
  const single = start || end;
  return formatDateFn ? formatDateFn(single) : single;
}

/** @param {string | null | undefined} raw */
export function parseInternshipAdditionalInfo(raw) {
  if (!raw) return { specializations: [], startDate: null, endDate: null };
  const text = String(raw).trim();
  if (!text) return { specializations: [], startDate: null, endDate: null };
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const specializations = Array.isArray(parsed.specializations)
        ? parsed.specializations.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
      return {
        specializations,
        startDate: resolveInternshipDateInput(parsed.startDate),
        endDate: resolveInternshipDateInput(parsed.endDate),
      };
    }
  } catch {
    /* legacy plain text — treat as empty specializations */
  }
  return { specializations: [], startDate: null, endDate: null };
}

/** @param {{ specializations?: string[] | string, startDate?: string | null, endDate?: string | null }} input */
export function buildInternshipAdditionalInfo(input = {}) {
  const list = Array.isArray(input.specializations)
    ? input.specializations
    : parseCommaList(input.specializations);
  const specializations = list.map((s) => String(s).trim()).filter(Boolean);
  const startDate = resolveInternshipDateInput(input.startDate);
  const endDate = resolveInternshipDateInput(input.endDate);
  const payload = {};
  if (specializations.length) payload.specializations = specializations;
  if (startDate) payload.startDate = startDate;
  if (endDate) payload.endDate = endDate;
  if (!Object.keys(payload).length) return null;
  return JSON.stringify(payload);
}

/**
 * Resolve internship dates from a DB row or mapped API object.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function resolveInternshipDatesFromRow(row) {
  if (!row) return { startDate: null, endDate: null };
  let startDate =
    resolveInternshipDateInput(row.internship_start_date) ||
    resolveInternshipDateInput(row.internshipStartDate) ||
    resolveInternshipDateInput(row.startDate);
  let endDate =
    resolveInternshipDateInput(row.internship_end_date) ||
    resolveInternshipDateInput(row.internshipEndDate) ||
    resolveInternshipDateInput(row.endDate);
  if (!startDate || !endDate) {
    const meta = parseInternshipAdditionalInfo(row.additional_info ?? row.additionalInfo);
    startDate = startDate || meta.startDate;
    endDate = endDate || meta.endDate;
  }
  if (!startDate || !endDate) {
    const fromDescription = parseInternshipDescriptionDates(row.description);
    startDate = startDate || fromDescription.startDate;
    endDate = endDate || fromDescription.endDate;
  }
  return { startDate: startDate || null, endDate: endDate || null };
}

/** @param {string | null | undefined} description */
export function parseInternshipDescriptionDates(description) {
  const text = String(description || '').trim();
  const periodMatch = text.match(
    /Internship period:\s*(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i,
  );
  if (periodMatch) {
    return {
      startDate: periodMatch[1],
      endDate: periodMatch[2],
    };
  }
  return { startDate: null, endDate: null };
}

/**
 * @param {string | null | undefined} startDate
 * @param {string | null | undefined} endDate
 * @param {string} [notes]
 */
export function buildInternshipDescription(startDate, endDate, notes) {
  const start = resolveInternshipDateInput(startDate);
  const end = resolveInternshipDateInput(endDate);
  const lines = [];
  if (start && end) {
    lines.push(`Internship period: ${start} to ${end}.`);
    const months = computeInternshipDurationMonths(start, end);
    if (months) lines.push(`Duration: ${months} months.`);
  }
  if (notes?.trim()) {
    if (lines.length) lines.push('');
    lines.push(notes.trim());
  }
  return lines.join('\n');
}

/** Legacy description parser (duration dropdown + notes). */
export function parseInternshipDescription(description) {
  const text = String(description || '').trim();
  const { startDate, endDate } = parseInternshipDescriptionDates(text);
  const durationFromDates = computeInternshipDurationMonths(startDate, endDate);
  const match = text.match(/^Duration:\s*(\d+)\s*months\.?\s*(?:\n\n([\s\S]*))?$/i);
  if (match) {
    return {
      durationMonths: match[1] || '6',
      notes: (match[2] || '').trim(),
      startDate,
      endDate,
    };
  }
  const periodFirst = text.match(
    /^Internship period:\s*\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}\.\s*(?:Duration:\s*(\d+)\s*months\.?\s*)?(?:\n\n([\s\S]*))?$/i,
  );
  if (periodFirst) {
    return {
      durationMonths: periodFirst[1] || (durationFromDates ? String(durationFromDates) : '6'),
      notes: (periodFirst[2] || '').trim(),
      startDate,
      endDate,
    };
  }
  return {
    durationMonths: durationFromDates ? String(durationFromDates) : '6',
    notes: text,
    startDate,
    endDate,
  };
}

/** @param {string[] | null | undefined} branches */
export function formatEligibleBranchesLabel(branches) {
  if (!Array.isArray(branches) || branches.length === 0) return 'All branches';
  if (branches.some((b) => /^all(\s+branches?)?$/i.test(String(b).trim()))) return 'All branches';
  return branches.join(', ');
}

/** @param {Record<string, unknown> | null | undefined} intern */
export function internshipEligibilityOpportunity(intern) {
  if (!intern) return null;
  const branches = intern.eligibleBranches ?? intern.branches;
  return {
    status: intern.status,
    minCgpa: intern.minCgpa ?? intern.cgpa ?? null,
    maxBacklogs: intern.maxBacklogs ?? null,
    eligibleBranches: Array.isArray(branches) && branches.length ? branches : null,
    batchYear: intern.batchYear ?? null,
  };
}

export function resolveEligibleBranchesInput(raw) {
  const list = Array.isArray(raw) ? raw : parseCommaList(raw);
  if (!list.length) return null;
  if (list.some((b) => /^all(\s+branches?)?$/i.test(String(b).trim()))) return null;
  return list;
}

export function resolveMaxBacklogsInput(value) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.floor(n));
}

export const INTERNSHIP_BATCH_YEAR_MAX_YEARS_AHEAD = 4;

/** @param {Date} [date] */
export function getInternshipBatchYearBounds(date = new Date()) {
  const year = date.getFullYear();
  return { min: year, max: year + INTERNSHIP_BATCH_YEAR_MAX_YEARS_AHEAD };
}

/**
 * Validate employer internship batch year (current calendar year through +4 years).
 * @param {string | number | null | undefined} value
 * @param {{ required?: boolean, date?: Date }} [options]
 * @returns {{ fieldErrors: Record<string, string>, formError: string | null, value: number | null }}
 */
export function validateInternshipBatchYearField(value, options = {}) {
  const { required = false, date = new Date() } = options;
  const fieldErrors = {};
  const raw = value === '' || value == null ? '' : String(value).trim();

  if (!raw) {
    if (required) fieldErrors.batchYear = 'Batch year is required.';
  } else if (!/^\d{4}$/.test(raw)) {
    fieldErrors.batchYear = 'Enter batch year as a 4-digit year (e.g. 2026).';
  } else {
    const y = Number(raw);
    const { min, max } = getInternshipBatchYearBounds(date);
    if (y < min) {
      fieldErrors.batchYear = `Batch year cannot be before ${min}.`;
    } else if (y > max) {
      fieldErrors.batchYear = `Batch year cannot be after ${max} (maximum ${INTERNSHIP_BATCH_YEAR_MAX_YEARS_AHEAD} years ahead).`;
    }
  }

  const formError = fieldErrors.batchYear || null;
  const resolved = formError ? null : raw ? Number(raw) : null;
  return { fieldErrors, formError, value: resolved };
}

/**
 * @param {string | number | null | undefined} value
 * @param {{ required?: boolean, date?: Date }} [options]
 * @returns {string | null}
 */
export function validateInternshipBatchYearForSubmit(value, options = {}) {
  return validateInternshipBatchYearField(value, options).formError;
}

export function resolveBatchYearInput(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.floor(n);
}
