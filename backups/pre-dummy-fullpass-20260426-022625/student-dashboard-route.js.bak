import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch stats
    const statsQuery = await query(`
      SELECT 
        COUNT(*) AS "totalApplications",
        COALESCE(SUM(CASE WHEN status IN ('shortlisted', 'in_progress', 'selected') THEN 1 ELSE 0 END), 0) AS "shortlisted",
        COALESCE(SUM(CASE WHEN status = 'selected' THEN 1 ELSE 0 END), 0) AS "offersReceived"
      FROM applications a
      JOIN student_profiles sp ON sp.id = a.student_id
      WHERE sp.user_id = $1
    `, [userId]);

    // Fetch upcoming drives available for student's college
    const drivesQuery = await query(`
      SELECT
        d.id,
        ep.company_name AS company,
        COALESCE(j.title, d.title) AS role,
        d.drive_date AS date,
        d.drive_type AS type,
        d.status,
        j.salary_min,
        j.salary_max
      FROM placement_drives d
      JOIN employer_profiles ep ON d.employer_id = ep.id
      LEFT JOIN job_postings j ON j.id = d.job_id
      WHERE d.tenant_id = $1 AND d.status IN ('approved', 'scheduled')
      ORDER BY d.drive_date ASC
      LIMIT 3
    `, [session.user.tenantId]);

    // Fetch recent applications
    const appsQuery = await query(`
      SELECT
        a.id,
        a.drive_id AS "driveId",
        ep.company_name AS company,
        COALESCE(j.title, d.title) AS role,
        a.status,
        a.current_round AS "currentRound",
        a.applied_at AS "appliedAt"
      FROM applications a
      JOIN placement_drives d ON a.drive_id = d.id
      JOIN employer_profiles ep ON d.employer_id = ep.id
      LEFT JOIN job_postings j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      WHERE sp.user_id = $1
      ORDER BY a.applied_at DESC
      LIMIT 3
    `, [userId]);

    return NextResponse.json({
      stats: {
        totalApplications: parseInt(statsQuery.rows[0].totalApplications || 0),
        shortlisted: parseInt(statsQuery.rows[0].shortlisted || 0),
        offersReceived: parseInt(statsQuery.rows[0].offersReceived || 0),
        upcomingDrives: drivesQuery.rows.length,
        profileCompletion: 80, // Dynamic calculation later
      },
      recentDrives: drivesQuery.rows.map(d => ({
        ...d,
        salary: d.salary_min ? "₹" + (d.salary_min/100000).toFixed(1) + "L - ₹" + (d.salary_max/100000).toFixed(1) + "L PA" : 'Not disclosed'
      })),
      applications: appsQuery.rows.map((a) => ({
        ...a,
        round: Number(a.currentRound) > 0 ? `Round ${a.currentRound}` : 'Pending',
      })),
    });
  } catch (error) {
    console.error('GET /api/student/dashboard', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
