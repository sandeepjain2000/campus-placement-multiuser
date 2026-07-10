import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_DRIVE_PD_NOT_DELETED, AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { displayEmployerTieUpStatus } from '@/lib/employerTieUp';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function resolveCollegeTenantId(session) {
  const sessionTenantId = session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
  if (sessionTenantId) return sessionTenantId;
  const userId = session?.user?.id || session?.user?.sub || null;
  if (!userId) return null;
  const r = await query(`SELECT tenant_id FROM users WHERE id = $1::uuid LIMIT 1`, [userId]);
  return r.rows[0]?.tenant_id || null;
}

/** GET — employers tied to this college (from employer_approvals + profile + stats). */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const result = await query(
      `SELECT
          ea.id AS approval_id,
          ea.status,
          ea.created_at,
          ep.id AS employer_id,
          ep.company_name AS name,
          ep.industry,
          ep.company_type,
          ep.website,
          ep.reliability_score,
          COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(ep.contact_email), '')) AS email,
          COALESCE((
            SELECT COUNT(*)::int FROM placement_drives pd
            WHERE pd.tenant_id = $1::uuid AND pd.employer_id = ep.id ${AND_DRIVE_PD_NOT_DELETED}
          ), 0) AS drives_count,
          COALESCE((
            SELECT COUNT(*)::int FROM offers o
            INNER JOIN student_profiles sp ON sp.id = o.student_id
            WHERE sp.tenant_id = $1::uuid AND o.employer_id = ep.id AND o.status = 'accepted'
              AND ${SP_ACTIVE_CLAUSE} ${AND_OFFER_NOT_DELETED}
          ), 0) AS past_hires
        FROM employer_approvals ea
        INNER JOIN employer_profiles ep ON ep.id = ea.employer_id
        LEFT JOIN users u ON u.id = ep.user_id
        WHERE ea.tenant_id = $1::uuid
        ORDER BY
          CASE ea.status
            WHEN 'pending' THEN 0
            WHEN 'approved' THEN 1
            WHEN 'rejected' THEN 2
            WHEN 'blacklisted' THEN 3
            WHEN 'revoked' THEN 3
            ELSE 4
          END,
          ea.created_at DESC`,
      [tenantId],
    );

    // Fetch POC assignments separately to avoid column-missing errors
    let pocMap = {};
    try {
      const pocRes = await query(
        `SELECT id, COALESCE(coordination_poc_user_ids, '{}') AS poc_ids
         FROM employer_approvals
         WHERE tenant_id = $1::uuid`,
        [tenantId],
      );
      pocRes.rows.forEach((r) => { pocMap[r.id] = r.poc_ids || []; });
    } catch {
      // Column may not exist in all DB versions — silently skip
    }

    const staff = await query(
      `SELECT id, first_name, last_name, role
       FROM users
       WHERE tenant_id = $1::uuid
         AND role = 'college_admin'
         AND is_active = true
       ORDER BY first_name ASC, last_name ASC`,
      [tenantId],
    );

    return NextResponse.json({
      employers: result.rows.map((row) => ({
        ...row,
        status: displayEmployerTieUpStatus(row.status),
        coordination_poc_user_ids: pocMap[row.approval_id] || [],
      })),
      staffDirectory: staff.rows.map((s) => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        role: s.role === 'college_admin' ? 'Placement Coordinator' : s.role,
      })),
    });
  } catch (error) {
    console.error('College employers list error:', error);
    return NextResponse.json({ error: 'Failed to load employers' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_employers' });
export const GET = __platformApiHandlers.GET;
