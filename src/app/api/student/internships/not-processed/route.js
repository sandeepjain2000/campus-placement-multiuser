import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  jobPostingNotDeletedSql,
  jobVisibilityCollegeApprovedSql,
  programApplicationNotDeletedSql,
} from '@/lib/migrationReady';
import {
  getStudentInternshipSelectionLock,
  mapProgramOpportunityRow,
  STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE,
} from '@/lib/internshipPlacementRules';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { resolveStudentPlacementTenantIds } from '@/lib/sessionTenant';
import { uuidInClause } from '@/lib/sqlPlaceholders';
import { studentListedJobPostingSql } from '@/lib/studentOpportunityQuery';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/**
 * Read-only list of internships the student could not apply to after FCFS internship selection.
 */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    const tenantIds = await resolveStudentPlacementTenantIds(userId, sessionTenant);
    if (!userId || !tenantIds.length) {
      return NextResponse.json({ error: 'Missing student context' }, { status: 400 });
    }

    const studentProfileId = await getOrCreateStudentProfileId(userId);
    const internshipLock = studentProfileId
      ? await getStudentInternshipSelectionLock(studentProfileId)
      : { locked: false, selectedJobId: null, selection: null };

    if (!internshipLock.locked) {
      return NextResponse.json({
        locked: false,
        reason: null,
        selectedInternship: null,
        items: [],
      });
    }

    const collegeApprovedSql = await jobVisibilityCollegeApprovedSql();
    const paNotDeletedSql = await programApplicationNotDeletedSql('pa');
    const jpNotDeletedSql = await jobPostingNotDeletedSql('jp');
    const { sql: tenantInSql, params: tenantInParams } = uuidInClause(tenantIds, 1);
    const userIdx = 1 + tenantInParams.length;

    const result = await query(
      `SELECT
         jp.id,
         jp.title,
         jp.description,
         jp.job_type,
         jp.salary_min,
         jp.salary_max,
         jp.min_cgpa,
         jp.max_backlogs,
         jp.eligible_branches,
         jp.batch_year,
         jp.vacancies,
         jp.skills_required,
         jp.application_deadline,
         jp.created_at,
         ep.id AS employer_id,
         ep.company_name,
         ep.website,
         pa.id AS application_id,
         pa.status AS application_status
       FROM job_postings jp
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       LEFT JOIN student_profiles sp ON sp.user_id = $${userIdx}::uuid
       LEFT JOIN program_applications pa ON pa.job_id = jp.id AND pa.student_id = sp.id
         ${paNotDeletedSql}
       WHERE jp.job_type = 'internship'
         ${jpNotDeletedSql}
         AND ${studentListedJobPostingSql('jp')}
         AND jp.id <> $${userIdx + 1}::uuid
         AND pa.id IS NULL
         AND EXISTS (
           SELECT 1
           FROM job_posting_visibility jpv
           INNER JOIN employer_approvals ea
             ON ea.employer_id = jp.employer_id
            AND ea.tenant_id = jpv.tenant_id
            AND ea.status = 'approved'
           WHERE jpv.job_id = jp.id
             AND jpv.tenant_id IN (${tenantInSql})
             ${collegeApprovedSql}
         )
       ORDER BY jp.created_at DESC`,
      [...tenantInParams, userId, internshipLock.selectedJobId],
    );

    return NextResponse.json({
      locked: true,
      reason: STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE,
      selectedInternship: internshipLock.selection,
      items: result.rows.map(mapProgramOpportunityRow),
    });
  } catch (e) {
    console.error('GET /api/student/internships/not-processed', e);
    return NextResponse.json({ error: 'Failed to load not-processed internships' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_internships_not_processed' });
export const GET = __platformApiHandlers.GET;
