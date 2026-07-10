import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { ARCHIVE_COLUMN_HINT } from '@/lib/collegeStudentArchive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await query(
      `SELECT
         sp.id,
         sp.roll_number,
         sp.department,
         sp.branch,
         sp.archived_at,
         sp.archived_by,
         t.id AS tenant_id,
         t.name AS college_name,
         t.short_code,
         u.email,
         u.first_name,
         u.last_name,
         arch.first_name AS archived_by_first_name,
         arch.last_name AS archived_by_last_name
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN users arch ON arch.id = sp.archived_by
       WHERE sp.archived_at IS NOT NULL
         AND COALESCE(sp.is_deleted, false) = false
       ORDER BY sp.archived_at DESC
       LIMIT 500`,
    );

    const students = res.rows.map((row) => {
      const shortCode = row.short_code || '';
      const rollNo = row.roll_number || '';
      const systemId = shortCode && rollNo ? `${shortCode}-${rollNo}` : rollNo;
      const archivedByName = [row.archived_by_first_name, row.archived_by_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        id: row.id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        email: row.email || '',
        roll: rollNo,
        systemId,
        dept: row.department || '',
        branch: row.branch || '',
        collegeName: row.college_name || '',
        tenantId: row.tenant_id,
        archivedAt: row.archived_at,
        archivedBy: archivedByName || null,
        archivedById: row.archived_by,
      };
    });

    return NextResponse.json({ students, total: students.length });
  } catch (error) {
    if (error?.code === '42703' && String(error?.message || '').includes('archived')) {
      return NextResponse.json({ error: ARCHIVE_COLUMN_HINT }, { status: 503 });
    }
    console.error('GET /api/admin/archived-students', error);
    return NextResponse.json({ error: 'Failed to load archived students' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_archived_students' });
export const GET = __platformApiHandlers.GET;
