import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const res = await query(
      `SELECT a.id,
              a.status,
              a.current_round,
              a.applied_at,
              d.id AS drive_id,
              d.title AS drive_title,
              ep.company_name,
              sp.department,
              sp.roll_number,
              COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name
       FROM applications a
       JOIN placement_drives d ON d.id = a.drive_id
       JOIN student_profiles sp ON sp.id = a.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE d.tenant_id = $1::uuid
       ORDER BY a.applied_at DESC
       LIMIT 1000`,
      [tenantId],
    );

    return NextResponse.json({ applications: res.rows });
  } catch (error) {
    console.error('GET /api/college/applications', error);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }
}
