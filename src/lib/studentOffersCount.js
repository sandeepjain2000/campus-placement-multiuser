import { query } from '@/lib/db';
import { hasColumn } from '@/lib/migrationReady';
import { OFFER_PENDING_STATUS_SQL } from '@/lib/offerStatusNormalize';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';

/**
 * Count offer rows visible on My Offers — same filter as /api/student/offers list.
 * Probes schema first so missing `is_latest` does not log a failed query, then
 * uses the same SQL branches as the previous try/catch fallback.
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

  const sql = (await hasColumn('offers', 'is_latest')) ? withLatest : withoutLatest;
  const result = await query(sql, [studentId]);
  return result.rows[0]?.n ?? 0;
}
