/**
 * Pure helpers for academic program → student profile mapping (client-safe).
 */

export function mapProgramToStudentFields(program) {
  if (!program) return null;
  const branch = program.specialization_name
    ? `${program.discipline_name} — ${program.specialization_name}`
    : program.discipline_name;
  return {
    degree_pursued: program.degree_name,
    department: program.discipline_name,
    branch,
    academic_program_code: program.code,
    eligibility_group_code: program.eligibility_group_code,
    eligibility_group_name: program.eligibility_group_name,
    academic_program_display: program.display_name,
  };
}

export function resolveStudentEligibilityGroupCode(aux) {
  if (!aux || typeof aux !== 'object') return null;
  return String(aux.eligibilityGroupCode || aux.eligibility_group_code || '').trim() || null;
}

export function resolveStudentEligibilityGroupName(aux) {
  if (!aux || typeof aux !== 'object') return null;
  return String(aux.eligibilityGroupName || aux.eligibility_group_name || '').trim() || null;
}
