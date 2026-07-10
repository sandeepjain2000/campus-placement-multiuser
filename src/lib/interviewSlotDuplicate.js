/** Normalize strings for duplicate interview slot checks. */
function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Employer interview slot fingerprint (campus + schedule + round).
 */
export function employerInterviewSlotKey(slot) {
  return [
    norm(slot.campusId || slot.campus),
    norm(slot.opportunityKind),
    norm(slot.opportunityId),
    norm(slot.date),
    norm(slot.time),
    norm(slot.round),
    norm(slot.mode),
  ].join('|');
}

export function findDuplicateEmployerInterviewSlot(existingRows, candidate, excludeId = null) {
  const key = employerInterviewSlotKey(candidate);
  return (
    (existingRows || []).find(
      (r) => r.id !== excludeId && employerInterviewSlotKey(r) === key,
    ) || null
  );
}

/**
 * College interview slot fingerprint.
 */
export function collegeInterviewSlotKey(slot) {
  return [
    norm(slot.company),
    norm(slot.round),
    norm(slot.date),
    norm(slot.startTime),
    norm(slot.endTime),
    norm(slot.interviewer),
  ].join('|');
}

export function findDuplicateCollegeInterviewSlot(existingRows, candidate, excludeId = null) {
  const key = collegeInterviewSlotKey(candidate);
  return (
    (existingRows || []).find(
      (s) => s.id !== excludeId && collegeInterviewSlotKey(s) === key,
    ) || null
  );
}
