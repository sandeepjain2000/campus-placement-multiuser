import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function calculateProfileCompletion(profile) {
  if (!profile) return 0;
  const checks = [
    profile.prn,
    profile.roll_number,
    profile.phone,
    profile.course,
    profile.branch,
    profile.current_semester,
    profile.cgpa,
    profile.tenth_percentage,
    profile.twelfth_percentage,
    profile.resume_url,
  ];
  const filled = checks.filter((v) => v != null && String(v).trim() !== '').length;
  return Math.round((filled / checks.length) * 100);
}

/** Map DB row (real columns + aliases) to completion shape */
function profileRowForCompletion(row) {
  if (!row) return null;
  return {
    prn: row.prn,
    roll_number: row.roll_number,
    phone: row.phone,
    course: row.course,
    branch: row.branch,
    current_semester: row.current_semester,
    cgpa: row.cgpa,
    tenth_percentage: row.tenth_percentage,
    twelfth_percentage: row.twelfth_percentage,
    resume_url: row.resume_url,
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'student') {
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

    const profileQuery = await query(
      `
      SELECT
        sp.roll_number,
        sp.enrollment_number AS prn,
        u.phone AS phone,
        sp.department AS course,
        sp.branch,
        8 AS current_semester,
        sp.cgpa,
        sp.tenth_percentage,
        sp.twelfth_percentage,
        sp.resume_url
      FROM student_profiles sp
      INNER JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id = $1::uuid
      LIMIT 1
      `,
      [userId]
    );
    const profileCompletion = calculateProfileCompletion(profileRowForCompletion(profileQuery.rows[0]));

    return NextResponse.json({
      stats: {
        totalApplications: parseInt(statsQuery.rows[0].totalApplications || 0),
        shortlisted: parseInt(statsQuery.rows[0].shortlisted || 0),
        offersReceived: parseInt(statsQuery.rows[0].offersReceived || 0),
        upcomingDrives: drivesQuery.rows.length,
        profileCompletion,
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
