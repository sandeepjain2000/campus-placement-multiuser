/**
 * Pure helpers for hiring-assessment UI: one row per student, newest upload wins.
 * Rows must be ordered with newest uploads first (see fetchAssessmentRowsForView ORDER BY).
 */

export function assessmentRowStudentKey(row) {
  if (row?.student_profile_id) return `sp:${row.student_profile_id}`;
  const roll = String(row?.roll_number ?? '').trim();
  if (roll) return `roll:${roll}`;
  return `row:${row?.id ?? 'unknown'}`;
}

export function pickRepresentativeAssessmentRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = assessmentRowStudentKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
