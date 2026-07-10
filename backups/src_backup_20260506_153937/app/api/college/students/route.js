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

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const students = await query(
      `SELECT
        sp.id,
        sp.roll_number,
        sp.department,
        sp.branch,
        sp.cgpa,
        sp.placement_status,
        sp.is_verified,
        sp.gender,
        sp.category,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COALESCE(
          ARRAY_AGG(DISTINCT ss.skill_name) FILTER (WHERE ss.skill_name IS NOT NULL),
          ARRAY[]::text[]
        ) AS skills
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      LEFT JOIN student_skills ss ON ss.student_id = sp.id
      WHERE sp.tenant_id = $1
      GROUP BY
        sp.id, sp.roll_number, sp.department, sp.branch, sp.cgpa, sp.placement_status,
        sp.is_verified, sp.gender, sp.category, u.first_name, u.last_name, u.avatar_url
      ORDER BY u.first_name ASC, u.last_name ASC`,
      [tenantId]
    );

    const rows = students.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      photo: row.avatar_url || null,
      roll: row.roll_number || '',
      dept: row.department || '',
      specialization: row.branch || '',
      semester: '',
      cgpa: row.cgpa !== null ? Number(row.cgpa) : null,
      jobStatus: row.placement_status || 'unplaced',
      internshipStatus: 'none',
      verified: Boolean(row.is_verified),
      skills: Array.isArray(row.skills) ? row.skills : [],
      gender: row.gender || '—',
      disabilityStatus: '—',
      diversityCategory: row.category || '—',
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to load college students:', error);
    return NextResponse.json(
      { error: 'Failed to load college students' },
      { status: 500 }
    );
  }
}
