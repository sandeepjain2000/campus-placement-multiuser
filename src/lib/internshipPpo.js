import { toDateOnlyString } from '@/lib/dateOnly';

/** Cleared for internship; PPO is not for applied / shortlisted rows. */
export const INTERNSHIP_PPO_ELIGIBLE_STATUSES = ['selected', 'in_progress'];

export const INTERNSHIP_PPO_STUDENT_PENDING = 'pending_student';
export const INTERNSHIP_PPO_ACCEPTED = 'accepted';
export const INTERNSHIP_PPO_DECLINED = 'declined';
export const INTERNSHIP_PPO_REVOKED = 'revoked';

export function isEligibleInternshipPpoApplicationStatus(status) {
  return INTERNSHIP_PPO_ELIGIBLE_STATUSES.includes(String(status || '').toLowerCase().trim());
}

/**
 * PPO can be confirmed only on or after the internship start date on the posting.
 * @param {string | Date | null | undefined} internshipStartDate
 * @param {Date} [now]
 */
export function isInternshipStartDateReached(internshipStartDate, now = new Date()) {
  const start = toDateOnlyString(internshipStartDate);
  if (!start) return false;
  const today = toDateOnlyString(now);
  return Boolean(today && today >= start);
}

export function validateInternshipPpoEmployerNotes(notes) {
  const t = String(notes || '').trim();
  if (t.length > 2000) return 'Notes must be 2000 characters or fewer.';
  return null;
}

export function canEmployerRevokePpo(ppo) {
  if (!ppo) return false;
  if (ppo.offerId || ppo.offer_id) return false;
  const status = String(ppo.status || '').toLowerCase();
  return status === INTERNSHIP_PPO_STUDENT_PENDING || status === INTERNSHIP_PPO_ACCEPTED;
}

export function canEmployerGeneratePpoJobOffer(ppo) {
  if (!ppo) return false;
  if (ppo.offerId || ppo.offer_id) return false;
  return String(ppo.status || '').toLowerCase() === INTERNSHIP_PPO_ACCEPTED;
}

export function canEmployerConfirmPpo(existingPpo) {
  if (!existingPpo) return true;
  if (existingPpo.offerId || existingPpo.offer_id) return false;
  const status = String(existingPpo.status || '').toLowerCase();
  return [INTERNSHIP_PPO_DECLINED, INTERNSHIP_PPO_REVOKED].includes(status);
}

/**
 * @param {import('pg').QueryResultRow | null | undefined} row
 */
export function mapInternshipPpoRow(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    programApplicationId: String(row.program_application_id),
    status: row.status,
    employerNotes: row.employer_notes || null,
    confirmedAt: row.confirmed_at,
    studentRespondedAt: row.student_responded_at || null,
    offerId: row.offer_id ? String(row.offer_id) : null,
    revokedAt: row.revoked_at || null,
    updatedAt: row.updated_at,
  };
}

export function ppoStatusLabel(status) {
  switch (String(status || '').toLowerCase()) {
    case INTERNSHIP_PPO_STUDENT_PENDING:
      return 'Awaiting your response';
    case INTERNSHIP_PPO_ACCEPTED:
      return 'PPO accepted';
    case INTERNSHIP_PPO_DECLINED:
      return 'PPO declined';
    case INTERNSHIP_PPO_REVOKED:
      return 'PPO revoked';
    default:
      return status || '—';
  }
}

export function employerPpoStatusLabel(status) {
  switch (String(status || '').toLowerCase()) {
    case INTERNSHIP_PPO_STUDENT_PENDING:
      return 'Awaiting student response';
    case INTERNSHIP_PPO_ACCEPTED:
      return 'Student accepted — ready for job offer';
    case INTERNSHIP_PPO_DECLINED:
      return 'Student declined';
    case INTERNSHIP_PPO_REVOKED:
      return 'Revoked';
    default:
      return 'Not confirmed';
  }
}
