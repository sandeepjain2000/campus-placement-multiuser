import { query } from '@/lib/db';
import { OFFER_PENDING_STATUS_SQL } from '@/lib/offerStatusNormalize';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

/**
 * Count offer rows visible on My Offers — same filter as /api/student/offers list.
 */
export async function countStudentVisibleOffers(studentId) {
  if (!studentId) return 0;

  const withLatest = `
    SELECT COUNT(*)::int AS n
    FROM offers o
    WHERE o.student_id = $1::uuid
      AND (o.is_latest = 1 OR ${OFFER_PENDING_STATUS_SQL})
      ${AND_OFFER_NOT_DELETED}`;

  const withoutLatest = `
    SELECT COUNT(*)::int AS n
    FROM offers o
    WHERE o.student_id = $1::uuid
      ${AND_OFFER_NOT_DELETED}`;

  try {
    const result = await query(withLatest, [studentId]);
    return result.rows[0]?.n ?? 0;
  } catch (e) {
    if (isMissingIsLatestError(e)) {
      const result = await query(withoutLatest, [studentId]);
      return result.rows[0]?.n ?? 0;
    }
    throw e;
  }
}
