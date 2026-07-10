import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const apps = await query(
      `
      SELECT
        a.id,
        a.drive_id,
        a.status,
        a.current_round,
        a.applied_at,
        d.drive_date,
        ep.company_name AS company,
        COALESCE(j.title, d.title) AS role
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN placement_drives d ON a.drive_id = d.id
      JOIN employer_profiles ep ON d.employer_id = ep.id
      LEFT JOIN job_postings j ON a.job_id = j.id
      WHERE sp.user_id = $1
      ORDER BY a.applied_at DESC
      `,
      [userId],
    );

    return NextResponse.json({
      items: apps.rows.map((row) => ({
        id: row.id,
        drive_id: row.drive_id,
        company: row.company,
        role: row.role,
        status: row.status,
        currentRound: row.current_round,
        appliedAt: row.applied_at,
        driveDate: row.drive_date,
      })),
    });
  } catch (error) {
    console.error('GET /api/student/applications', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { drive_id, location_preference } = await req.json();

    if (!drive_id) {
      return NextResponse.json({ error: 'Drive ID required' }, { status: 400 });
    }

    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({
        error: 'Student profile not found. Complete profile setup before applying.',
      }, { status: 400 });
    }

    const notes = location_preference ? `Preferred Location: ${location_preference}` : null;

    try {
      const ins = await query(
        `
        INSERT INTO applications (student_id, drive_id, job_id, status, notes)
        SELECT $1, d.id, d.job_id, 'applied', $3
        FROM placement_drives d
        WHERE d.id = $2
        ON CONFLICT (student_id, drive_id)
        DO UPDATE SET status = 'applied', notes = EXCLUDED.notes, updated_at = NOW()
        RETURNING id
      `,
        [studentId, drive_id, notes],
      );

      if (ins.rowCount === 0) {
        return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Application submitted successfully' });
    } catch (dbError) {
      console.error('DB Insert failed:', dbError);
      return NextResponse.json({ error: 'Could not save application' }, { status: 500 });
    }
  } catch (error) {
    console.error('Application API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
