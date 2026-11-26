import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = String(searchParams.get('collegeId') || '').trim();
    const params = [];
    let collegeClause = '';
    if (collegeId) {
      if (!isUuid(collegeId)) {
        return NextResponse.json({ error: 'Invalid college filter' }, { status: 400 });
      }
      params.push(collegeId);
      collegeClause = ` AND sp.tenant_id = $${params.length}::uuid`;
    }

    const res = await query(
      `SELECT
         sp.id,
         sp.roll_number,
         sp.department,
         sp.branch,
         sp.batch_year,
         sp.placement_status,
         sp.is_verified,
         sp.created_at,
         t.id AS tenant_id,
         t.name AS college_name,
         t.short_code,
         u.email,
         u.first_name,
         u.last_name,
         u.is_active AS account_active
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE ${SP_ACTIVE_CLAUSE}${collegeClause}
       ORDER BY t.name ASC, u.first_name ASC, u.last_name ASC
       LIMIT 5000`,
      params,
    );

    const students = res.rows.map((row) => {
      const shortCode = row.short_code || '';
      const rollNo = row.roll_number || '';
      const systemId = shortCode && rollNo ? `${shortCode}-${rollNo}` : rollNo;

      return {
        id: row.id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—',
        email: row.email || '',
        roll: rollNo,
        systemId,
        dept: row.department || '',
        branch: row.branch || '',
        batchYear: row.batch_year || null,
        placementStatus: row.placement_status || '',
        verified: Boolean(row.is_verified),
        accountActive: row.account_active !== false,
        collegeName: row.college_name || '',
        tenantId: row.tenant_id,
        createdAt: row.created_at || null,
      };
    });

    return NextResponse.json({ students, total: students.length });
  } catch (error) {
    console.error('GET /api/admin/students', error);
    return NextResponse.json({ error: 'Failed to load students' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  {
    GET: __platform_GET,
  },
  { context: 'api_admin_students' },
);
export const GET = __platformApiHandlers.GET;
