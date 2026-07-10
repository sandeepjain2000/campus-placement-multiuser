import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';

function formatSalary(min, max) {
  if (!min && !max) return 'Not disclosed';
  if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L PA`;
  if (min) return `₹${(min / 100000).toFixed(1)}L+ PA`;
  return `Up to ₹${(max / 100000).toFixed(1)}L PA`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentProfileId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentProfileId) {
      return NextResponse.json({ drives: [] });
    }

    const res = await query(
      `
      SELECT
        d.id,
        ep.company_name AS company,
        COALESCE(j.title, d.title) AS role,
        d.drive_date AS date,
        d.drive_type AS type,
        d.venue,
        d.status,
        d.max_students AS vacancies,
        d.registered_count AS registered,
        j.min_cgpa AS cgpa,
        j.eligible_branches AS branch,
        COALESCE(j.salary_min, 0) AS salary_min,
        COALESCE(j.salary_max, 0) AS salary_max,
        a.id IS NOT NULL AS applied
      FROM placement_drives d
      JOIN employer_profiles ep ON d.employer_id = ep.id
      LEFT JOIN job_postings j ON d.job_id = j.id
      LEFT JOIN applications a
        ON a.drive_id = d.id
       AND a.student_id = $1
       AND a.status <> 'withdrawn'
      WHERE d.tenant_id = $2
        AND d.status IN ('approved', 'scheduled')
      ORDER BY d.drive_date ASC, d.created_at DESC
      `,
      [studentProfileId, session.user.tenantId],
    );

    return NextResponse.json({
      drives: res.rows.map((row) => ({
        id: row.id,
        company: row.company,
        role: row.role,
        date: row.date,
        type: row.type,
        venue: row.venue || 'TBD',
        offCampusCity: null,
        salary: formatSalary(Number(row.salary_min), Number(row.salary_max)),
        status: row.status,
        branch: Array.isArray(row.branch) && row.branch.length > 0 ? row.branch : ['All eligible branches'],
        cgpa: row.cgpa ?? 0,
        vacancies: row.vacancies ?? 0,
        registered: row.registered ?? 0,
        deadline: null,
        applied: Boolean(row.applied),
      })),
    });
  } catch (error) {
    console.error('GET /api/student/drives', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
