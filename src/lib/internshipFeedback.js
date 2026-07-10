export const INTERNSHIP_FEEDBACK_AUTHOR_ROLES = ['student', 'employer'];

/** Applications eligible for internship feedback (cleared selection or active internship). */
export const INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES = ['selected', 'in_progress'];

export function normalizeInternshipFeedbackRating(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.trunc(n);
}

export function validateInternshipFeedbackText(text) {
  const t = String(text || '').trim();
  if (t.length < 10) return 'Feedback must be at least 10 characters.';
  if (t.length > 4000) return 'Feedback must be 4000 characters or fewer.';
  return null;
}

export function isEligibleInternshipApplicationStatus(status) {
  return INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES.includes(String(status || '').toLowerCase().trim());
}

/**
 * @param {import('pg').QueryResultRow} row
 */
export function mapInternshipFeedbackRow(row) {
  return {
    id: String(row.id),
    programApplicationId: String(row.program_application_id),
    authorRole: row.author_role,
    rating: row.rating != null ? Number(row.rating) : null,
    feedbackText: row.feedback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    studentName: row.student_name || null,
    rollNumber: row.roll_number || null,
    branch: row.branch || null,
    companyName: row.company_name || null,
    openingTitle: row.opening_title || null,
    applicationStatus: row.application_status || null,
  };
}
