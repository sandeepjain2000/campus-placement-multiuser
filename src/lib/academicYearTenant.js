/**
 * Tenant academic years: label formats, period overlap checks, semester display rules.
 */

const LABEL_SINGLE = /^\d{4}$/;
const LABEL_SPAN = /^(\d{4})-(\d{2})$/;

export function parseAcademicYearLabel(label) {
  const raw = String(label || '').trim();
  const single = raw.match(LABEL_SINGLE);
  if (single) {
    const y = Number(single[0]);
    return { valid: true, startYear: y, endYear: y, label: String(y) };
  }
  const span = raw.match(LABEL_SPAN);
  if (span) {
    const startYear = Number(span[1]);
    const endShort = Number(span[2]);
    const endYear = Math.floor(startYear / 100) * 100 + endShort;
    const expectedEnd = (startYear + 1) % 100;
    if (endShort !== expectedEnd) {
      return { valid: false, error: `End year must be ${String(expectedEnd).padStart(2, '0')} for ${startYear}-${String(expectedEnd).padStart(2, '0')}.` };
    }
    return {
      valid: true,
      startYear,
      endYear: startYear + 1,
      label: `${startYear}-${String(expectedEnd).padStart(2, '0')}`,
    };
  }
  return { valid: false, error: 'Label must be YYYY or YYYY-YY (e.g. 2025 or 2025-26).' };
}

export function toDateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateIso(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : toDateOnly(d);
  if (!x) return '';
  return x.toISOString().slice(0, 10);
}

/** Inclusive range overlap for [aStart,aEnd] and [bStart,bEnd]. */
export function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  const as = toDateOnly(aStart)?.getTime();
  const ae = toDateOnly(aEnd)?.getTime();
  const bs = toDateOnly(bStart)?.getTime();
  const be = toDateOnly(bEnd)?.getTime();
  if (as == null || ae == null || bs == null || be == null) return false;
  return as <= be && bs <= ae;
}

export function validateAcademicYearRow(row, { existingRows = [], rowIndex = 0 } = {}) {
  const errors = [];
  const parsed = parseAcademicYearLabel(row.label);
  if (!parsed.valid) errors.push(parsed.error);

  const seq = Number(row.sequenceNumber);
  if (!Number.isInteger(seq) || seq < 1) errors.push('Sequence must be a positive integer (1, 2, 3, …).');

  const start = toDateOnly(row.periodStart);
  const end = toDateOnly(row.periodEnd);
  if (!start || !end) errors.push('Academic year period start and end are required.');
  else if (start > end) errors.push('Period end must be on or after period start.');

  const semCount = Number(row.semesterCount);
  if (!Number.isInteger(semCount) || semCount < 1 || semCount > 3) {
    errors.push('Semester count must be 1, 2, or 3.');
  }

  const semesters = Array.isArray(row.semesters) ? row.semesters : [];
  if (semesters.length !== semCount) {
    errors.push(`Define exactly ${semCount} semester period(s).`);
  }

  const semSeqs = new Set();
  for (const sem of semesters) {
    const sn = Number(sem.sequenceNumber);
    if (!Number.isInteger(sn) || sn < 1 || sn > semCount) {
      errors.push(`Semester sequence must be between 1 and ${semCount}.`);
    }
    if (semSeqs.has(sn)) errors.push(`Duplicate semester sequence ${sn}.`);
    semSeqs.add(sn);
    const ss = toDateOnly(sem.periodStart);
    const se = toDateOnly(sem.periodEnd);
    if (!ss || !se) errors.push(`Semester ${sn}: start and end dates are required.`);
    else if (ss > se) errors.push(`Semester ${sn}: end must be on or after start.`);
    else if (start && end && (ss < start || se > end)) {
      errors.push(`Semester ${sn}: must fall within the academic year period.`);
    }
  }

  for (let i = 0; i < semesters.length; i++) {
    for (let j = i + 1; j < semesters.length; j++) {
      if (
        periodsOverlap(
          semesters[i].periodStart,
          semesters[i].periodEnd,
          semesters[j].periodStart,
          semesters[j].periodEnd,
        )
      ) {
        errors.push(
          `Semesters ${semesters[i].sequenceNumber} and ${semesters[j].sequenceNumber} overlap.`
        );
      }
    }
  }

  for (let i = 0; i < existingRows.length; i++) {
    if (i === rowIndex) continue;
    const other = existingRows[i];
    if (other.id && row.id && other.id === row.id) continue;
    if (Number(other.sequenceNumber) === seq) {
      errors.push(`Sequence ${seq} is already used by ${other.label || 'another year'}.`);
    }
    if (
      parsed.valid &&
      parseAcademicYearLabel(other.label).valid &&
      other.label === parsed.label
    ) {
      errors.push(`Duplicate label ${parsed.label}.`);
    }
    if (
      start &&
      end &&
      periodsOverlap(start, end, other.periodStart, other.periodEnd)
    ) {
      errors.push(`Period overlaps with ${other.label || 'another academic year'}.`);
    }
  }

  return { ok: errors.length === 0, errors, parsed };
}

export function validateAcademicYearsPayload(years) {
  const list = Array.isArray(years) ? years : [];
  const allErrors = [];
  const seqSet = new Set();
  const labelSet = new Set();

  list.forEach((row, idx) => {
    const { ok, errors } = validateAcademicYearRow(row, { existingRows: list, rowIndex: idx });
    if (!ok) {
      allErrors.push({ index: idx, label: row.label, errors });
    }
    const seq = Number(row.sequenceNumber);
    if (seqSet.has(seq)) {
      allErrors.push({ index: idx, label: row.label, errors: [`Duplicate sequence ${seq} in payload.`] });
    }
    seqSet.add(seq);
    const pl = parseAcademicYearLabel(row.label);
    if (pl.valid && labelSet.has(pl.label)) {
      allErrors.push({ index: idx, label: row.label, errors: [`Duplicate label ${pl.label} in payload.`] });
    }
    if (pl.valid) labelSet.add(pl.label);
  });

  return { ok: allErrors.length === 0, errors: allErrors };
}

/**
 * @param {Date} date
 * @param {Array<{ period_start: string, period_end: string, id: string, label: string }>} years
 */
export function findAcademicYearForDate(date, years) {
  const t = date instanceof Date ? date : new Date(date);
  const ts = t.getTime();
  for (const y of years) {
    const s = toDateOnly(y.period_start || y.periodStart)?.getTime();
    const e = toDateOnly(y.period_end || y.periodEnd)?.getTime();
    if (s != null && e != null && ts >= s && ts <= e) return y;
  }
  return null;
}

export function compareYearPosition(selectedYear, currentYear) {
  if (!selectedYear || !currentYear) return 'current';
  const ss = toDateOnly(selectedYear.period_start || selectedYear.periodStart)?.getTime();
  const cs = toDateOnly(currentYear.period_start || currentYear.periodStart)?.getTime();
  if (ss == null || cs == null) {
    return selectedYear.id === currentYear.id ? 'current' : 'unknown';
  }
  if (ss < cs) return 'past';
  if (ss > cs) return 'future';
  return 'current';
}

function semesterContainingDate(semesters, date) {
  const t = date instanceof Date ? date : new Date(date);
  const ts = t.getTime();
  for (const s of semesters) {
    const start = toDateOnly(s.period_start || s.periodStart)?.getTime();
    const end = toDateOnly(s.period_end || s.periodEnd)?.getTime();
    if (start != null && end != null && ts >= start && ts <= end) return s;
  }
  return null;
}

/**
 * Display semester on student list when Academic Year selection changes.
 * - Current AY (system date): semester from system date
 * - Past AY: last semester of that year
 * - Future AY: semester 1
 */
export function displaySemesterForStudentList({
  semesters,
  selectedAcademicYear,
  currentAcademicYear,
  systemDate = new Date(),
}) {
  const sorted = [...(semesters || [])].sort(
    (a, b) => Number(a.sequence_number ?? a.sequenceNumber) - Number(b.sequence_number ?? b.sequenceNumber),
  );
  if (!sorted.length) return { sequenceNumber: null, label: '—' };

  const position = compareYearPosition(selectedAcademicYear, currentAcademicYear);

  let pick;
  if (position === 'past') {
    pick = sorted[sorted.length - 1];
  } else if (position === 'future') {
    pick = sorted[0];
  } else {
    pick = semesterContainingDate(sorted, systemDate) || sorted[sorted.length - 1];
  }

  const n = Number(pick.sequence_number ?? pick.sequenceNumber);
  return { sequenceNumber: n, label: `Semester ${n}` };
}

export function mapYearRowFromDb(row, semesters = []) {
  return {
    id: row.id,
    label: row.label,
    sequenceNumber: row.sequence_number,
    periodStart: formatDateIso(row.period_start),
    periodEnd: formatDateIso(row.period_end),
    semesterCount: row.semester_count,
    semesters: semesters
      .filter((s) => s.academic_year_id === row.id)
      .sort((a, b) => a.sequence_number - b.sequence_number)
      .map((s) => ({
        id: s.id,
        sequenceNumber: s.sequence_number,
        periodStart: formatDateIso(s.period_start),
        periodEnd: formatDateIso(s.period_end),
      })),
  };
}
