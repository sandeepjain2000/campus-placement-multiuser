/**
 * Internship hire flow uses bulk formal offers (S-62) as the single outbound email.
 * Selection is in-app only — avoids "selected, offer coming" + formal offer double mail.
 */
export function shouldEmailStudentOnInternshipSelection(sourceKind, jobType) {
  if (sourceKind !== 'program') return true;
  return String(jobType || '').trim().toLowerCase() !== 'internship';
}
