import { resolveStudentBatch } from '@/lib/studentBatch';

/** Typical UG programme length; longer spans are flagged for recruiters. */
export const MAX_TYPICAL_DEGREE_DURATION_YEARS = 6;

/**
 * @param {{
 *   batchYear?: number | string | null;
 *   graduationYear?: number | string | null;
 *   joiningAcademicYear?: string | null;
 *   joining_academic_year?: string | null;
 *   batch?: string | null;
 *   batchLabel?: string | null;
 * }} fields
 * @returns {{ joiningYear: number, graduationYear: number, durationYears: number, message: string } | null}
 */
export function getDegreeTimelineWarning(fields = {}) {
  const resolved = resolveStudentBatch({
    batchYear: fields.batchYear ?? fields.batch_year,
    graduationYear: fields.graduationYear ?? fields.graduation_year,
    joining_academic_year: fields.joining_academic_year ?? fields.joiningAcademicYear,
    batchLabel: fields.batchLabel ?? fields.batch,
    joiningAcademicYear: fields.joiningAcademicYear ?? fields.batch,
  });

  const joiningYear = resolved.batchYear;
  const graduationYear = resolved.graduationYear;
  if (!Number.isFinite(joiningYear) || !Number.isFinite(graduationYear)) {
    return null;
  }

  const durationYears = graduationYear - joiningYear;
  if (durationYears <= MAX_TYPICAL_DEGREE_DURATION_YEARS) {
    return null;
  }

  return {
    joiningYear,
    graduationYear,
    durationYears,
    message: `Joined in ${joiningYear} and graduating in ${graduationYear} (${durationYears}-year span). Typical degree programmes are ${MAX_TYPICAL_DEGREE_DURATION_YEARS} years or less — please verify with the candidate or placement office.`,
  };
}
