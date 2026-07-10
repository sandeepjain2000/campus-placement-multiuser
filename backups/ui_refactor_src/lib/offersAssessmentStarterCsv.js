/**
 * CSV text matching college / employer offers import templates.
 * College: one row per campus master-list student; company prefilled from newest assessment row when present.
 * Employer: roll + tenant_id + optional drive_id from newest assessment batch for that campus.
 */

export function csvEscapeCell(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {Array<{ student_profile_id: string, roll_number: string }>} masterRows
 * @param {Map<string, Record<string, unknown>>} assessmentByProfileId from pickRepresentativeAssessmentRows
 */
export function buildCollegeOffersAllStudentsCsv(masterRows, assessmentByProfileId) {
  const header = 'roll_number,company_name,job_title,salary,location,deadline,status';
  const lines = [header];
  for (const s of masterRows) {
    const a = assessmentByProfileId.get(s.student_profile_id);
    const company = a?.employer_company ?? '';
    lines.push(
      [
        csvEscapeCell(s.roll_number ?? ''),
        csvEscapeCell(company),
        '',
        '',
        '',
        '',
        'pending',
      ].join(','),
    );
  }
  return lines.join('\n');
}

/**
 * @param {Array<{ roll_number: string, tenant_id: string, upload_drive_id?: string | null }>} flatRows
 */
export function buildEmployerOffersAllStudentsCsv(flatRows) {
  const header = 'roll_number,tenant_id,job_title,salary,location,joining_date,deadline,drive_id,status';
  const lines = [header];
  for (const r of flatRows) {
    const driveId = r.upload_drive_id ? String(r.upload_drive_id) : '';
    lines.push(
      [
        csvEscapeCell(r.roll_number ?? ''),
        csvEscapeCell(r.tenant_id ?? ''),
        '',
        '',
        '',
        '',
        '',
        csvEscapeCell(driveId),
        'accepted',
      ].join(','),
    );
  }
  return lines.join('\n');
}

export const COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME = 'offers_all_students.csv';
export const EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME = 'employer_offers_all_students.csv';
