import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getEmployerProfileId(userId) {
  const r = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0]?.id || null;
}

/** @param {import('pg').QueryResultRow} row */
function mapRow(row) {
  const first = row.first_name || '';
  const last = row.last_name || '';
  return {
    id: row.id,
    sourceKind: row.source_kind,
    status: row.status,
    appliedAt: row.applied_at,
    currentRound: row.current_round,
    studentProfileId: row.student_id,
    studentName: `${first} ${last}`.trim() || row.email || 'Student',
    email: row.email,
    collegeName: row.college_name || '—',
    branch: row.branch || row.department || '—',
    cgpa: row.cgpa != null ? Number(row.cgpa) : null,
    resumeUrl: row.resume_url || null,
    openingTitle: row.opening_title || '—',
    jobType: row.job_type || null,
    driveId: row.drive_id,
    notes: row.notes || null,
  };
}

/**
 * GET ?tab=jobs|internships|projects
 * Jobs = drive applications (applications table). Internships / projects = program_applications.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tabParam = (searchParams.get('tab') || 'jobs').toLowerCase();
    const tab = tabParam === 'internships' || tabParam === 'projects' ? tabParam : 'jobs';

    const countsSql = `
      SELECT
        (SELECT COUNT(*)::int FROM applications a
         INNER JOIN placement_drives d ON d.id = a.drive_id
         WHERE d.employer_id = $1::uuid) AS jobs,
        (SELECT COUNT(*)::int FROM program_applications pa
         INNER JOIN job_postings jp ON jp.id = pa.job_id
         WHERE jp.employer_id = $1::uuid AND jp.job_type = 'internship') AS internships,
        (SELECT COUNT(*)::int FROM program_applications pa
         INNER JOIN job_postings jp ON jp.id = pa.job_id
         WHERE jp.employer_id = $1::uuid AND jp.job_type IN ('short_project', 'hackathon')) AS projects
    `;
    const countsRes = await query(countsSql, [employerId]);
    const counts = countsRes.rows[0] || { jobs: 0, internships: 0, projects: 0 };

    let itemsRes;
    if (tab === 'jobs') {
      itemsRes = await query(
        `SELECT
           a.id,
           'drive' AS source_kind,
           a.status,
           a.applied_at,
           a.current_round,
           sp.id AS student_id,
           u.first_name,
           u.last_name,
           u.email,
           t.name AS college_name,
           sp.branch,
           sp.department,
           sp.cgpa,
           sp.resume_url,
           COALESCE(jp.title, d.title) AS opening_title,
           COALESCE(jp.job_type::text, 'placement_drive') AS job_type,
           d.id AS drive_id,
           NULL::text AS notes
         FROM applications a
         INNER JOIN placement_drives d ON d.id = a.drive_id
         INNER JOIN employer_profiles ep ON ep.id = d.employer_id
         INNER JOIN student_profiles sp ON sp.id = a.student_id
         INNER JOIN users u ON u.id = sp.user_id
         LEFT JOIN tenants t ON t.id = sp.tenant_id
         LEFT JOIN job_postings jp ON jp.id = COALESCE(a.job_id, d.job_id)
         WHERE ep.id = $1::uuid
         ORDER BY a.applied_at DESC`,
        [employerId],
      );
    } else if (tab === 'internships') {
      itemsRes = await query(
        `SELECT
           pa.id,
           'program' AS source_kind,
           pa.status,
           pa.applied_at,
           NULL::int AS current_round,
           sp.id AS student_id,
           u.first_name,
           u.last_name,
           u.email,
           t.name AS college_name,
           sp.branch,
           sp.department,
           sp.cgpa,
           sp.resume_url,
           jp.title AS opening_title,
           jp.job_type::text AS job_type,
           NULL::uuid AS drive_id,
           pa.notes
         FROM program_applications pa
         INNER JOIN job_postings jp ON jp.id = pa.job_id
         INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
         INNER JOIN student_profiles sp ON sp.id = pa.student_id
         INNER JOIN users u ON u.id = sp.user_id
         LEFT JOIN tenants t ON t.id = sp.tenant_id
         WHERE ep.id = $1::uuid AND jp.job_type = 'internship'
         ORDER BY pa.applied_at DESC`,
        [employerId],
      );
    } else {
      itemsRes = await query(
        `SELECT
           pa.id,
           'program' AS source_kind,
           pa.status,
           pa.applied_at,
           NULL::int AS current_round,
           sp.id AS student_id,
           u.first_name,
           u.last_name,
           u.email,
           t.name AS college_name,
           sp.branch,
           sp.department,
           sp.cgpa,
           sp.resume_url,
           jp.title AS opening_title,
           jp.job_type::text AS job_type,
           NULL::uuid AS drive_id,
           pa.notes
         FROM program_applications pa
         INNER JOIN job_postings jp ON jp.id = pa.job_id
         INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
         INNER JOIN student_profiles sp ON sp.id = pa.student_id
         INNER JOIN users u ON u.id = sp.user_id
         LEFT JOIN tenants t ON t.id = sp.tenant_id
         WHERE ep.id = $1::uuid AND jp.job_type IN ('short_project', 'hackathon')
         ORDER BY pa.applied_at DESC`,
        [employerId],
      );
    }

    return NextResponse.json({
      tab,
      counts: {
        jobs: Number(counts.jobs) || 0,
        internships: Number(counts.internships) || 0,
        projects: Number(counts.projects) || 0,
      },
      items: itemsRes.rows.map(mapRow),
    });
  } catch (e) {
    console.error('GET /api/employer/applications', e);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }
}
