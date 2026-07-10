import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {


  AND_APP_NOT_DELETED,
  AND_DRIVE_PD_NOT_DELETED,
  AND_JP_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function __platform_GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: driveId } = await params;
    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    // Fetch Drive Info
    const driveQuery = await query(`
      SELECT pd.title, pd.drive_date, pd.drive_type, pd.status,
             ep.company_name, pd.ctc_breakup
      FROM placement_drives pd
      LEFT JOIN employer_profiles ep ON pd.employer_id = ep.id
      WHERE pd.id = $1 AND pd.tenant_id = $2 ${AND_DRIVE_PD_NOT_DELETED}
    `, [driveId, tenantId]);

    if (driveQuery.rowCount === 0) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    const driveInfo = driveQuery.rows[0];

    // Fetch Statistics
    const statsQuery = await query(`
      SELECT status, COUNT(*) as count
      FROM applications a
      WHERE a.drive_id = $1 ${AND_APP_NOT_DELETED}
      GROUP BY status
    `, [driveId]);

    const stats = {
      total_applied: 0,
      shortlisted: 0,
      in_progress: 0,
      selected: 0,
      withdrawn: 0,
      rejected: 0,
    };

    statsQuery.rows.forEach(row => {
      stats.total_applied += parseInt(row.count);
      if (stats[row.status] !== undefined) {
        stats[row.status] = parseInt(row.count);
      }
    });

    // Fetch Selected Students
    const selectedQuery = await query(`
      SELECT sp.roll_number, sp.department, sp.branch, sp.cgpa, u.first_name, u.last_name
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE a.drive_id = $1 AND a.status = 'selected' AND ${SP_ACTIVE_CLAUSE} ${AND_APP_NOT_DELETED}
    `, [driveId]);

    const report = {
      generatedAt: new Date().toISOString(),
      drive: driveInfo,
      statistics: stats,
      selectedStudents: selectedQuery.rows.map(s => ({
        name: `${s.first_name} ${s.last_name || ''}`.trim(),
        rollNumber: s.roll_number,
        department: s.department,
        branch: s.branch,
        cgpa: s.cgpa
      }))
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Report Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate drive report' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_drives_id_report' });
export const GET = __platformApiHandlers.GET;
