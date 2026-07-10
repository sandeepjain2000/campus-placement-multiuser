import { query } from '@/lib/db';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';

/**
 * Load college placement offer rules for a tenant.
 * @param {string} tenantId
 */
export async function getCollegeOfferRules(tenantId) {
  if (!tenantId) {
    return { maxOffers: 1, acceptanceWindowDays: 7 };
  }
  const res = await query(
    `SELECT max_offers_per_student, offer_acceptance_window_days
     FROM college_settings WHERE tenant_id = $1::uuid`,
    [tenantId],
  );
  const row = res.rows[0];
  return {
    maxOffers: Math.max(1, Number(row?.max_offers_per_student ?? 1)),
    acceptanceWindowDays: Math.max(1, Number(row?.offer_acceptance_window_days ?? 7)),
  };
}

/**
 * Enforce max simultaneous acceptances and acceptance window from first acceptance.
 * @param {string} studentId
 * @param {string | null} tenantId
 */
export async function assertStudentMayAcceptOffer(studentId, tenantId) {
  const { maxOffers, acceptanceWindowDays } = await getCollegeOfferRules(tenantId);

  const acceptedRes = await query(
    `SELECT COUNT(*)::int AS n, MIN(accepted_at) AS first_accepted
     FROM offers o WHERE o.student_id = $1::uuid AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}`,
    [studentId],
  );
  const acceptedCount = acceptedRes.rows[0]?.n ?? 0;
  const firstAccepted = acceptedRes.rows[0]?.first_accepted;

  if (Number.isFinite(maxOffers) && maxOffers > 0 && acceptedCount >= maxOffers) {
    return {
      ok: false,
      error: `You can accept at most ${maxOffers} offer(s) under your college placement rules. Decline an existing acceptance or contact your placement office.`,
    };
  }

  if (firstAccepted && acceptanceWindowDays > 0) {
    const deadline = new Date(firstAccepted);
    deadline.setDate(deadline.getDate() + acceptanceWindowDays);
    if (new Date() > deadline && acceptedCount >= 1) {
      return {
        ok: false,
        error: `Your ${acceptanceWindowDays}-day window to confirm a final offer has ended. Contact your placement office.`,
      };
    }
  }

  return { ok: true, maxOffers, acceptanceWindowDays };
}
