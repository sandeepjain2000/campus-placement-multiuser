import { INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES, isEligibleInternshipApplicationStatus } from '@/lib/internshipFeedback';

export { INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES as INTERNSHIP_GUIDE_ELIGIBLE_STATUSES, isEligibleInternshipApplicationStatus };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInternshipGuideName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

export function validateInternshipGuidePayload(payload, { requireName = true } = {}) {
  const guideName = normalizeInternshipGuideName(payload?.guideName ?? payload?.guide_name);
  const guideEmail = String(payload?.guideEmail ?? payload?.guide_email ?? '').trim();
  const guidePhone = String(payload?.guidePhone ?? payload?.guide_phone ?? '').trim();
  const guideDepartment = String(payload?.guideDepartment ?? payload?.guide_department ?? '').trim();
  const guideNotes = String(payload?.guideNotes ?? payload?.guide_notes ?? '').trim();

  if (requireName && guideName.length < 2) {
    return { error: 'Guide name must be at least 2 characters.' };
  }
  if (guideName.length > 120) {
    return { error: 'Guide name must be 120 characters or fewer.' };
  }
  if (guideEmail && !EMAIL_RE.test(guideEmail)) {
    return { error: 'Enter a valid guide email address.' };
  }
  if (guideEmail.length > 255) {
    return { error: 'Guide email must be 255 characters or fewer.' };
  }
  if (guidePhone.length > 30) {
    return { error: 'Guide phone must be 30 characters or fewer.' };
  }
  if (guideDepartment.length > 120) {
    return { error: 'Guide department must be 120 characters or fewer.' };
  }
  if (guideNotes.length > 2000) {
    return { error: 'Guide notes must be 2000 characters or fewer.' };
  }

  return {
    guideName,
    guideEmail: guideEmail || null,
    guidePhone: guidePhone || null,
    guideDepartment: guideDepartment || null,
    guideNotes: guideNotes || null,
  };
}

/**
 * @param {import('pg').QueryResultRow | null | undefined} row
 */
export function mapInternshipGuideRow(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    programApplicationId: String(row.program_application_id),
    guideName: row.guide_name,
    guideEmail: row.guide_email || null,
    guidePhone: row.guide_phone || null,
    guideDepartment: row.guide_department || null,
    guideNotes: row.guide_notes || null,
    updatedAt: row.updated_at,
  };
}
