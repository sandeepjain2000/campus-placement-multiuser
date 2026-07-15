import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { jobPostingNotDeletedSql, programApplicationNotDeletedSql } from '@/lib/migrationReady';
import { resolveAlumniStudentFlag } from '@/lib/studentAlumniServer';
import { ALUMNI_JOB_TYPES } from '@/lib/studentAlumni';
import { evaluateStudentOverviewCompletion } from '@/lib/studentProfileCompletion';
import { countStudentVisibleOffers } from '@/lib/studentOffersCount';
import { formatSalaryRangeParts } from '@/lib/utils';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const isAlumni = await resolveAlumniStudentFlag(userId, session.user);
    const paNotDeletedSql = await programApplicationNotDeletedSql('pa');
    const jpNotDeletedSql = await jobPostingNotDeletedSql('jp');

    let statsQuery;
    let drivesQuery;
    let appsQuery;

    if (isAlumni) {
      statsQuery = await query(
        `SELECT
          COUNT(*) AS "totalApplications",
          COALESCE(SUM(CASE WHEN pa.status IN ('shortlisted', 'in_progress', 'selected') THEN 1 ELSE 0 END), 0) AS "shortlisted"
        FROM program_applications pa
        JOIN student_profiles sp ON sp.id = pa.student_id
        WHERE sp.user_id = $1 AND ${SP_ACTIVE_CLAUSE} ${paNotDeletedSql}`,
        [userId],
      );

      drivesQuery = await query(
        `SELECT
          jp.id,
          ep.company_name AS company,
          ep.website AS website,
          jp.title AS role,
          jp.application_deadline AS date,
          'alumni_job' AS type,
          jp.status
        FROM job_postings jp
        JOIN employer_profiles ep ON jp.employer_id = ep.id
        INNER JOIN job_posting_visibility jpv
          ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
        WHERE jp.job_type = ANY($2::text[])
          AND jp.status = 'published'
          AND jpv.college_status = 'approved'
          ${jpNotDeletedSql}
        ORDER BY jp.created_at DESC
        LIMIT 3`,
        [session.user.tenantId, ALUMNI_JOB_TYPES],
      ).catch(async (e) => {
        if (e?.code !== '42703') throw e;
        return query(
          `SELECT
            jp.id,
            ep.company_name AS company,
            ep.website AS website,
            jp.title AS role,
            jp.application_deadline AS date,
            'alumni_job' AS type,
            jp.status
          FROM job_postings jp
          JOIN employer_profiles ep ON jp.employer_id = ep.id
          INNER JOIN job_posting_visibility jpv
            ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
          WHERE jp.job_type = ANY($2::text[])
            AND jp.status = 'published'
            ${jpNotDeletedSql}
          ORDER BY jp.created_at DESC
          LIMIT 3`,
          [session.user.tenantId, ALUMNI_JOB_TYPES],
        );
      });

      appsQuery = await query(
        `SELECT
          pa.id,
          pa.job_id AS "driveId",
          ep.company_name AS company,
          ep.website AS website,
          jp.title AS role,
          pa.status,
          0 AS "currentRound",
          pa.applied_at AS "appliedAt"
        FROM program_applications pa
        JOIN job_postings jp ON pa.job_id = jp.id
        JOIN employer_profiles ep ON jp.employer_id = ep.id
        JOIN student_profiles sp ON pa.student_id = sp.id
        WHERE sp.user_id = $1 AND ${SP_ACTIVE_CLAUSE}
          ${paNotDeletedSql} ${jpNotDeletedSql}
        ORDER BY pa.applied_at DESC
        LIMIT 3`,
        [userId],
      );
    } else {
      statsQuery = await query(
        `SELECT
          COUNT(*) AS "totalApplications",
          COALESCE(SUM(CASE WHEN status IN ('shortlisted', 'in_progress', 'selected') THEN 1 ELSE 0 END), 0) AS "shortlisted"
        FROM applications a
        JOIN student_profiles sp ON sp.id = a.student_id
        WHERE sp.user_id = $1 AND ${SP_ACTIVE_CLAUSE} ${AND_APP_NOT_DELETED}`,
        [userId],
      );

      drivesQuery = await query(
        `SELECT
          d.id,
          ep.company_name AS company,
          ep.website AS website,
          d.title AS role,
          d.drive_date AS date,
          d.drive_type AS type,
          d.status,
          d.salary_min,
          d.salary_max
        FROM placement_drives d
        JOIN employer_profiles ep ON d.employer_id = ep.id
        WHERE d.tenant_id = $1 AND d.status IN ('approved', 'scheduled') ${AND_DRIVE_NOT_DELETED}
        ORDER BY d.drive_date ASC
        LIMIT 3`,
        [session.user.tenantId],
      );

      appsQuery = await query(
        `SELECT
          a.id,
          a.drive_id AS "driveId",
          ep.company_name AS company,
          ep.website AS website,
          d.title AS role,
          a.status,
          a.current_round AS "currentRound",
          a.applied_at AS "appliedAt"
        FROM applications a
        JOIN placement_drives d ON a.drive_id = d.id
        JOIN employer_profiles ep ON d.employer_id = ep.id
        JOIN student_profiles sp ON a.student_id = sp.id
        WHERE sp.user_id = $1 AND ${SP_ACTIVE_CLAUSE}
          ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
        ORDER BY a.applied_at DESC
        LIMIT 3`,
        [userId],
      );
    }

    const profileQuery = await query(
      `
      SELECT
        sp.id AS student_id,
        sp.roll_number,
        sp.department,
        sp.branch,
        u.phone AS user_phone,
        sp.cgpa,
        sp.tenth_percentage,
        sp.twelfth_percentage,
        sp.resume_url,
        (
          SELECT COUNT(*)::int
          FROM student_skills ss
          WHERE ss.student_id = sp.id
        ) AS skills_count
      FROM student_profiles sp
      INNER JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
      LIMIT 1
      `,
      [userId]
    );
    const profileRow = profileQuery.rows[0] || null;
    const { profileCompletion, items: profileCompletionItems } = evaluateStudentOverviewCompletion(
      profileRow,
      { skillsCount: profileRow?.skills_count ?? 0 },
    );

    const offersReceived = await countStudentVisibleOffers(profileRow?.student_id);

    return NextResponse.json({
      isAlumni,
      stats: {
        totalApplications: parseInt(statsQuery.rows[0].totalApplications || 0),
        shortlisted: parseInt(statsQuery.rows[0].shortlisted || 0),
        offersReceived,
        upcomingDrives: drivesQuery.rows.length,
        profileCompletion,
        profileCompletionItems,
      },
      recentDrives: drivesQuery.rows.map((d) => {
        if (d.type === 'alumni_job') {
          return { ...d, salary: 'See job details', salaryWords: '' };
        }
        const parts = formatSalaryRangeParts(
          d.salary_min != null ? Number(d.salary_min) : null,
          d.salary_max != null ? Number(d.salary_max) : null,
        );
        return {
          ...d,
          salary: parts.numeric,
          salaryWords: parts.words,
        };
      }),
      applications: appsQuery.rows.map((a) => ({
        ...a,
        round: Number(a.currentRound) > 0 ? `Round ${a.currentRound}` : 'Pending',
      })),
    });
  } catch (error) {
    console.error('GET /api/student/dashboard', error);
    const msg = String(error?.message || '').trim();
    return NextResponse.json(
      { error: msg || 'Database unavailable' },
      { status: 503 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_dashboard' });
export const GET = __platformApiHandlers.GET;
