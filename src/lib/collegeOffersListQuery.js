import { query } from '@/lib/db';
import { AND_OFFER_NOT_DELETED, AND_SP_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/** Prefer roster name; fall back to email, roll, Unknown. */
const STUDENT_NAME_SQL = `COALESCE(
  NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
  NULLIF(TRIM(u.email), ''),
  sp.roll_number,
  'Unknown'
) AS student_name`;

function buildCollegeOffersSql(latestOnly, useReported) {
  const latestClause = latestOnly ? 'AND o.is_latest = 1' : '';
  const companyExpr = useReported
    ? 'COALESCE(ep.company_name, o.reported_company_name) AS company_name'
    : 'ep.company_name AS company_name';

  return `
  SELECT
    o.id,
    o.student_id,
    sp.roll_number,
    ${STUDENT_NAME_SQL},
    ten.name AS college_name,
    ${companyExpr},
    ep.website AS company_website,
    o.job_title,
    o.salary,
    o.location,
    o.status,
    o.deadline,
    o.joining_date,
    o.created_at,
    o.updated_at,
    o.employer_id IS NOT NULL AS linked_employer
  FROM offers o
  JOIN student_profiles sp ON sp.id = o.student_id
  LEFT JOIN users u ON u.id = sp.user_id
  JOIN tenants ten ON ten.id = sp.tenant_id
  LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
  WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE} ${AND_OFFER_NOT_DELETED} ${latestClause}
  ORDER BY o.created_at DESC
  LIMIT 500`;
}

function isMissingReportedColumnError(e) {
  const msg = String(e?.message || '');
  return e?.code === '42703' || msg.includes('reported_company_name');
}

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

async function queryWithLatestFallback(latestOnly, useReported, tenantId) {
  const res = await query(buildCollegeOffersSql(latestOnly, useReported), [tenantId]);
  if (latestOnly && res.rows.length === 0) {
    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM offers o
       JOIN student_profiles sp ON sp.id = o.student_id
       WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE} ${AND_OFFER_NOT_DELETED}`,
      [tenantId],
    );
    const total = Number(countRes.rows[0]?.n) || 0;
    if (total > 0) {
      console.warn(
        `college offers: ${total} offer(s) for tenant but none with is_latest=1; listing all rows (run refresh or seed)`,
      );
      return query(buildCollegeOffersSql(false, useReported), [tenantId]);
    }
  }
  return res;
}

export async function queryCollegeOffersForTenant(tenantId) {
  try {
    return await queryWithLatestFallback(true, true, tenantId);
  } catch (e) {
    if (isMissingIsLatestError(e)) {
      try {
        return await query(buildCollegeOffersSql(false, true), [tenantId]);
      } catch (e2) {
        if (isMissingReportedColumnError(e2)) {
          console.warn('college offers: reported_company_name missing; legacy SELECT (run migration 018)');
          return await query(buildCollegeOffersSql(false, false), [tenantId]);
        }
        throw e2;
      }
    }
    if (isMissingReportedColumnError(e)) {
      console.warn('college offers: reported_company_name missing; legacy SELECT (run migration 018)');
      try {
        return await queryWithLatestFallback(true, false, tenantId);
      } catch (e2) {
        if (isMissingIsLatestError(e2)) {
          return await query(buildCollegeOffersSql(false, false), [tenantId]);
        }
        throw e2;
      }
    }
    throw e;
  }
}
