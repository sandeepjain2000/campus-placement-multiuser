import { query } from '@/lib/db';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { AND_OFFER_NOT_DELETED, AND_SP_NOT_DELETED } from '@/lib/softDeleteSql';

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

export class OfferService {
  /**
   * Fetch all offers for a specific employer.
   */
  static async getEmployerOffers(employerId) {
    if (!employerId) return [];

    const baseSql = (latestOnly) => {
      const clause = latestOnly ? 'AND o.is_latest = 1' : '';
      return `SELECT
         o.id,
         COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
         t.name AS college_name,
         o.job_title,
         o.salary,
         o.location,
         o.joining_date,
         o.drive_id,
         o.deadline AS deadline_at,
         o.status,
         o.created_at,
         o.is_latest AS is_latest,
         o.offer_letter_url AS offer_letter_url,
         o.offer_kind,
         o.program_application_id
       FROM offers o
       LEFT JOIN student_profiles sp ON sp.id = o.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       WHERE o.employer_id = $1 ${clause} ${AND_OFFER_NOT_DELETED} ${AND_SP_NOT_DELETED}
       ORDER BY o.created_at DESC
       LIMIT 500`;
    };

    try {
      const offersResult = await query(baseSql(true), [employerId]);
      return offersResult.rows;
    } catch (e) {
      if (isMissingIsLatestError(e)) {
        const fallbackResult = await query(
          `SELECT
             o.id,
             COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
             t.name AS college_name,
             o.job_title,
             o.salary,
             o.location,
             o.joining_date,
             o.drive_id,
             o.deadline AS deadline_at,
             o.status,
             o.created_at,
             o.offer_letter_url AS offer_letter_url,
             o.offer_kind,
             o.program_application_id
           FROM offers o
           LEFT JOIN student_profiles sp ON sp.id = o.student_id
           LEFT JOIN users u ON u.id = sp.user_id
           LEFT JOIN tenants t ON t.id = sp.tenant_id
           WHERE o.employer_id = $1 ${AND_OFFER_NOT_DELETED} ${AND_SP_NOT_DELETED}
           ORDER BY o.created_at DESC
           LIMIT 500`,
          [employerId],
        );
        return fallbackResult.rows;
      }
      throw e;
    }
  }

  /**
   * Delete an employer's offer and refresh flags.
   */
  static async deleteEmployerOffer(id, employerId) {
    const del = await query(
      `DELETE FROM offers WHERE id = $1::uuid AND employer_id = $2::uuid RETURNING student_id`,
      [id, employerId],
    );
    if (!del.rows[0]) {
      return null; // Not found
    }
    await refreshOfferLatestFlagsForStudent(del.rows[0].student_id);
    return true;
  }
}
