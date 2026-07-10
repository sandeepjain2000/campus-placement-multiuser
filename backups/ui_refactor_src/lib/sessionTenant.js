import { query } from '@/lib/db';

/**
 * All tenant UUIDs that can represent this student's campus for placement visibility.
 * Includes profile college, optional member college (group setups), and users.tenant_id so we match
 * `job_posting_visibility` the same way the college dashboard does (avoids a single COALESCE picking the wrong id).
 */
export async function resolveStudentPlacementTenantIds(userId, sessionFallbackTenantId) {
  const sqlFull = `SELECT u.tenant_id AS u_tid, sp.tenant_id AS sp_tid, sp.member_tenant_id AS mem_tid
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1::uuid`;
  const sqlBase = `SELECT u.tenant_id AS u_tid, sp.tenant_id AS sp_tid
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1::uuid`;

  let row;
  try {
    const r = await query(sqlFull, [userId]);
    row = r.rowCount ? r.rows[0] : null;
  } catch (e) {
    if (!String(e?.message || '').includes('member_tenant_id')) throw e;
    const r = await query(sqlBase, [userId]);
    row = r.rowCount ? { ...r.rows[0], mem_tid: null } : null;
  }

  const raw = row ? [row.sp_tid, row.mem_tid, row.u_tid, sessionFallbackTenantId] : [sessionFallbackTenantId];
  const ids = [...new Set(raw.filter(Boolean).map((x) => String(x)))];
  return ids;
}

/** College admin's tenant from DB (JWT can be stale after admin updates). */
export async function resolveCollegeAdminTenantId(userId, sessionFallbackTenantId) {
  const r = await query(`SELECT tenant_id FROM users WHERE id = $1::uuid AND role = 'college_admin'`, [userId]);
  return r.rows[0]?.tenant_id || sessionFallbackTenantId || null;
}
