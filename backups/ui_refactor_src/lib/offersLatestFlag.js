import { query } from '@/lib/db';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';

const RANK_UNIFIED_SQL = `WITH ranked AS (
         SELECT o.id,
           ROW_NUMBER() OVER (
             PARTITION BY o.student_id,
               LOWER(TRIM(regexp_replace(COALESCE(
                 CASE WHEN o.employer_id IS NOT NULL THEN ep.company_name END,
                 NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
                 CASE
                   WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text
                   ELSE 'offplatform'
                 END
               ), '[[:space:]]+', ' ', 'g')))
             ORDER BY o.created_at DESC, o.id DESC
           ) AS rn
         FROM offers o
         LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
         WHERE o.student_id = $1::uuid
       )
       UPDATE offers o
       SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END,
           updated_at = NOW()
       FROM ranked r
       WHERE o.id = r.id`;

/** Same as migration 019 legacy branch: one chain per student for all employer_id IS NULL rows. */
const RANK_LEGACY_NO_REPORTED_SQL = `WITH ranked AS (
         SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY student_id,
               COALESCE(employer_id::text, 'offplatform')
             ORDER BY created_at DESC, id DESC
           ) AS rn
         FROM offers
         WHERE student_id = $1::uuid
       )
       UPDATE offers o
       SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END,
           updated_at = NOW()
       FROM ranked r
       WHERE o.id = r.id`;

/**
 * Recompute is_latest (0/1) for every offer row of this student.
 * Partition per student: normalized company = trimmed reported_company_name, else
 * employer_profiles.company_name, else employer:'<uuid>' or offplatform — merges linked vs text-only rows.
 * If offers.reported_company_name is missing (pre–018 DB), falls back to employer_id / offplatform buckets.
 */
export async function refreshOfferLatestFlagsForStudent(studentId) {
  if (!studentId) return;
  try {
    await query(RANK_UNIFIED_SQL, [studentId]);
  } catch (e) {
    if (isMissingReportedCompanyColumnError(e)) {
      try {
        await query(RANK_LEGACY_NO_REPORTED_SQL, [studentId]);
      } catch (e2) {
        if (e2?.code === '42703' && String(e2?.message || '').includes('is_latest')) {
          console.warn('refreshOfferLatestFlagsForStudent: column is_latest missing; apply migration 019_offers_is_latest.sql');
          return;
        }
        throw e2;
      }
      return;
    }
    if (e?.code === '42703' && String(e?.message || '').includes('is_latest')) {
      console.warn('refreshOfferLatestFlagsForStudent: column is_latest missing; apply migration 019_offers_is_latest.sql');
      return;
    }
    throw e;
  }
}
