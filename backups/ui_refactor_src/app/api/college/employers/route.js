import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET — employers tied to this college (from employer_approvals + profile + stats). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;

    const result = await query(
      `SELECT
          ea.id AS approval_id,
          ea.status,
          ea.created_at,
          ea.coordination_poc_user_ids,
          ep.id AS employer_id,
          ep.company_name AS name,
          ep.industry,
          ep.company_type,
          ep.website,
          ep.reliability_score,
          COALESCE((
            SELECT COUNT(*)::int FROM placement_drives pd
            WHERE pd.tenant_id = $1::uuid AND pd.employer_id = ep.id
          ), 0) AS drives_count,
          COALESCE((
            SELECT COUNT(*)::int FROM offers o
            INNER JOIN student_profiles sp ON sp.id = o.student_id
            WHERE sp.tenant_id = $1::uuid AND o.employer_id = ep.id AND o.status = 'accepted'
          ), 0) AS past_hires
        FROM employer_approvals ea
        INNER JOIN employer_profiles ep ON ep.id = ea.employer_id
        WHERE ea.tenant_id = $1::uuid
        ORDER BY
          CASE ea.status
            WHEN 'pending' THEN 0
            WHEN 'approved' THEN 1
            WHEN 'rejected' THEN 2
            WHEN 'blacklisted' THEN 3
            ELSE 4
          END,
          ea.created_at DESC`,
      [tenantId],
    );

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
        coordination_poc_user_ids: row.coordination_poc_user_ids || [],
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
