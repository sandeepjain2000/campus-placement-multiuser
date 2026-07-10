import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { campusProgramsForbiddenForAlumniResponse, isAlumniStudent } from '@/lib/studentAlumni';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function rowDateToYmd(v) {
  if (v == null) return '';
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
    if (m) return m[1];
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAlumniStudent(session.user)) {
      return campusProgramsForbiddenForAlumniResponse();
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) return NextResponse.json({ events: [] });

    /* Same visibility rules as GET /api/student/drives — avoids calendar vs browse mismatch */
    const res = await query(
      `SELECT d.id, COALESCE(ep.company_name, 'Company') AS company,
              d.title AS role, d.drive_date, d.drive_type, d.status
       FROM placement_drives d
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       JOIN student_profiles sp ON sp.id = $1::uuid
       WHERE d.tenant_id = sp.tenant_id AND ${SP_ACTIVE_CLAUSE}
         AND d.status IN ('approved', 'scheduled') ${AND_DRIVE_NOT_DELETED}
       ORDER BY d.drive_date ASC, d.created_at DESC
       LIMIT 500`,
      [studentId],
    );

    const events = res.rows.map((r) => ({
      id: r.id,
      date: rowDateToYmd(r.drive_date),
      title: `${r.company} — ${r.role || 'Drive'}`,
      type: r.drive_type || 'on_campus',
      status: r.status || 'scheduled',
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('GET /api/student/calendar', error);
    return NextResponse.json({ error: 'Failed to load student calendar' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_calendar' });
export const GET = __platformApiHandlers.GET;
