/**
 * Student batch = admission / intake year (YYYY). Legacy YYYY-YY labels are normalized on read.
 */
import {
  parseAdmissionBatchYear,
  normalizeAdmissionBatchLabel,
} from '@/lib/admissionBatchYear';

export function normalizeAdmissionYear(value) {
  if (value == null || value === '') return null;
  const n = parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n) || n < 1990 || n > 2040) return null;
  return n;
}

export function normalizeGraduationYear(value) {
  return normalizeAdmissionYear(value);
}

/** Parse and normalize an admission batch year (YYYY). */
export function parseJoiningBatch(raw, options) {
  const parsed = parseAdmissionBatchYear(raw, options);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      batch: '',
      joiningAcademicYear: '',
      batchYear: null,
    };
  }
  if (!parsed.label) {
    return { ok: true, batch: '', joiningAcademicYear: '', batchYear: null };
  }
  return {
    ok: true,
    batch: parsed.label,
    joiningAcademicYear: parsed.label,
    batchYear: parsed.year,
  };
}

/** Resolve batch for list/profile/API. */
export function resolveStudentBatch({
  batchYear,
  graduationYear,
  batchLabel,
  joiningAcademicYear,
  joining_academic_year,
} = {}) {
  const joiningRaw = String(
    joining_academic_year || joiningAcademicYear || batchLabel || '',
  ).trim();
  if (joiningRaw) {
    const normalized = normalizeAdmissionBatchLabel(joiningRaw);
    const parsed = parseAdmissionBatchYear(normalized);
    return {
      batch: normalized || joiningRaw,
      joiningAcademicYear: normalized || joiningRaw,
      batchYear: normalizeAdmissionYear(batchYear) ?? parsed.year ?? null,
      graduationYear: normalizeGraduationYear(graduationYear),
    };
  }

  const by = normalizeAdmissionYear(batchYear);
  return {
    batch: by ? String(by) : '',
    joiningAcademicYear: by ? String(by) : '',
    batchYear: by,
    graduationYear: normalizeGraduationYear(graduationYear),
  };
}

/**
 * Joining batch year plus optional explicit admission / graduation years.
 */
export function reconcileBatchFields({ batch, batch_year, graduation_year }, options) {
  const joining = parseJoiningBatch(batch, options);
  const explicitBy = normalizeAdmissionYear(batch_year);
  const explicitGy = normalizeGraduationYear(graduation_year);

  return {
    error: joining.ok ? null : joining.error,
    batchLabel: joining.joiningAcademicYear,
    joiningAcademicYear: joining.joiningAcademicYear,
    batchYear: explicitBy ?? joining.batchYear,
    graduationYear: explicitGy,
  };
}

/** @deprecated Use admission batch year helpers in admissionBatchYear.js */
export function formatBatchLabel(batchYear, graduationYear) {
  const by = normalizeAdmissionYear(batchYear);
  if (by) return String(by);
  const gy = normalizeGraduationYear(graduationYear);
  if (gy) return String(gy);
  return '';
}
