import { query } from '@/lib/db';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';

/**
 * Read-only consolidated rows from employer_assessment_* for Hiring Assessment screens.
 * @param {{ employerId?: string | null, tenantId?: string | null }} filter
 */
export async function fetchAssessmentRowsForView(filter) {
  const { employerId, tenantId } = filter;
  const params = [];
  let where = '1=1';
  if (employerId) {
    params.push(employerId);
    where += ` AND eau.employer_id = $${params.length}::uuid`;
  }
  if (tenantId) {
    params.push(tenantId);
    where += ` AND eau.tenant_id = $${params.length}::uuid`;
  }

  const rows = await query(
    `SELECT
       ear.id,
       ear.student_profile_id,
       ear.roll_number,
       COALESCE(
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
         NULLIF(TRIM(u.email), ''),
         ear.roll_number
       ) AS candidate_name,
       ear.round_1_result,
       ear.round_2_result,
       ear.round_3_result,
       ear.round_4_result,
       ear.round_5_result,
       ear.remarks,
       eau.id AS upload_id,
       eau.drive_id AS upload_drive_id,
       eau.original_file_name,
       eau.created_at AS upload_created_at,
       eau.tenant_id,
       t.name AS tenant_name,
       ep.company_name AS employer_company
     FROM employer_assessment_rows ear
     JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
     JOIN employer_profiles ep ON ep.id = eau.employer_id
     JOIN tenants t ON t.id = eau.tenant_id
     JOIN student_profiles sp ON sp.id = ear.student_profile_id
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE ${where}
     ORDER BY eau.created_at DESC, ear.roll_number ASC NULLS LAST, ear.created_at ASC`,
    params,
  );

  return rows.rows;
}

/** Round labels from the employer's latest upload (optional tenant filter). */
export async function fetchLatestRoundLabels(employerId, tenantId = null) {
  const params = [employerId];
  let tenantClause = '';
  if (tenantId) {
    params.push(tenantId);
    tenantClause = `AND tenant_id = $2::uuid`;
  }
  const up = await query(
    `SELECT id FROM employer_assessment_uploads
     WHERE employer_id = $1::uuid ${tenantClause}
     ORDER BY created_at DESC
     LIMIT 1`,
    params,
  );
  const uploadId = up.rows[0]?.id;
  if (!uploadId) {
    return [1, 2, 3, 4, 5].map((n) => ({ round_no: n, round_label: `Round ${n}` }));
  }
  const rounds = await query(
    `SELECT round_no, round_label FROM employer_assessment_rounds
     WHERE upload_id = $1::uuid
     ORDER BY round_no ASC`,
    [uploadId],
  );
  const list = rounds.rows;
  if (list.length >= 5) return list;
  const byNo = new Map(list.map((r) => [Number(r.round_no), r.round_label]));
  return [1, 2, 3, 4, 5].map((n) => ({
    round_no: n,
    round_label: byNo.get(n) || `Round ${n}`,
  }));
}

/** Round labels for college view: latest upload for this tenant (any employer). */
export async function fetchLatestRoundLabelsForTenant(tenantId) {
  const up = await query(
    `SELECT id FROM employer_assessment_uploads
     WHERE tenant_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId],
  );
  const uploadId = up.rows[0]?.id;
  if (!uploadId) {
    return [1, 2, 3, 4, 5].map((n) => ({ round_no: n, round_label: `Round ${n}` }));
  }
  const rounds = await query(
    `SELECT round_no, round_label FROM employer_assessment_rounds
     WHERE upload_id = $1::uuid
     ORDER BY round_no ASC`,
    [uploadId],
  );
  const list = rounds.rows;
  if (list.length >= 5) return list;
  const byNo = new Map(list.map((r) => [Number(r.round_no), r.round_label]));
  return [1, 2, 3, 4, 5].map((n) => ({
    round_no: n,
    round_label: byNo.get(n) || `Round ${n}`,
  }));
}

export { pickRepresentativeAssessmentRows };

export function buildAssessmentSummary(rows) {
  const nonEmpty = (v) => String(v ?? '').trim().length > 0;
  const rep = pickRepresentativeAssessmentRows(rows);
  const uploadIds = new Set(rows.map((r) => r.upload_id).filter(Boolean));

  const perRoundFilled = [1, 2, 3, 4, 5].map((n) => {
    const col = `round_${n}_result`;
    return rep.filter((r) => nonEmpty(r[col])).length;
  });

  const perRoundByStatus = [1, 2, 3, 4, 5].map((n) => {
    const col = `round_${n}_result`;
    const buckets = new Map();
    for (const r of rep) {
      const raw = String(r[col] ?? '').trim();
      if (!raw) continue;
      const lk = raw.toLowerCase();
      const cur = buckets.get(lk);
      if (cur) cur.count += 1;
      else buckets.set(lk, { status: raw, count: 1 });
    }
    return [...buckets.values()].sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  });

  const perRoundUnspecified = [1, 2, 3, 4, 5].map((n) => {
    const col = `round_${n}_result`;
    return rep.filter((r) => !nonEmpty(r[col])).length;
  });

  return {
    /** Distinct students in summary (one line per profile / roll after newest-upload wins). */
    uniqueStudentCount: rep.length,
    /** Raw accepted lines (same student may appear in multiple uploads). */
    totalResultRows: rows.length,
    uploadsCount: uploadIds.size,
    perRoundFilled,
    /** Per round: [{ status, count }, …] from representative row per student; statuses merged case-insensitively. */
    perRoundByStatus,
    /** Students with empty / no outcome in that round (representative row). */
    perRoundUnspecified,
  };
}
