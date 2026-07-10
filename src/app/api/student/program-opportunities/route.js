import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  jobPostingNotDeletedSql,
  jobVisibilityCollegeApprovedSql,
  programApplicationNotDeletedSql,
} from '@/lib/migrationReady';
import { getStudentApplyGate } from '@/lib/studentApplyEligibility';
import { getStudentBrowseGate } from '@/lib/studentBrowseGate';
import { mergeCampusCvVerificationApplyGate } from '@/lib/collegeCvVerification';
import { getStudentCampusCvVerificationGate } from '@/lib/studentCv';
import {
  getStudentInternshipSelectionLock,
  mapProgramOpportunityRow,
  STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE,
} from '@/lib/internshipPlacementRules';
import { loadStudentApplyProfile } from '@/lib/studentApplyProfile';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { resolveStudentPlacementTenantIds } from '@/lib/sessionTenant';
import { uuidInClause } from '@/lib/sqlPlaceholders';
import { studentListedJobPostingSql } from '@/lib/studentOpportunityQuery';
import {
  getStudentOpportunityListCache,
  setStudentOpportunityListCache,
} from '@/lib/jobPostingPublishState';
import {
  ALUMNI_JOB_TYPES,
  alumniJobsForbiddenResponse,
  campusProgramsForbiddenForAlumniResponse,
} from '@/lib/studentAlumni';
import { resolveAlumniStudentFlag } from '@/lib/studentAlumniServer';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function queryStudentProgramOpportunities({
  tenantInParams,
  tenantInSql,
  userIdx,
  typesIdx,
  userId,
  types,
  listedSql,
  jpNotDeletedSql,
  paNotDeletedSql,
  collegeApprovedSql,
}) {
  const sql = `SELECT
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
         jp.internship_start_date,
         jp.internship_end_date,
         jp.additional_info,
         jp.application_deadline,
         jp.status,
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
       WHERE jp.job_type = ANY($${typesIdx}::text[])
         ${jpNotDeletedSql}
         AND (
           (
             ${listedSql}
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
           )
           OR pa.id IS NOT NULL
         )
       ORDER BY COALESCE(pa.applied_at, jp.created_at) DESC`;

  try {
    return await query(sql, [...tenantInParams, userId, types]);
  } catch (e) {
    const msg = String(e?.message || '');
    if (e?.code !== '42703' && e?.code !== '42P01') throw e;

    const fallbackSql = `SELECT
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
         NULL::date AS internship_start_date,
         NULL::date AS internship_end_date,
         jp.additional_info,
         jp.application_deadline,
         jp.status,
         jp.created_at,
         ep.id AS employer_id,
         ep.company_name,
         ep.website,
         NULL::uuid AS application_id,
         NULL::varchar AS application_status
       FROM job_postings jp
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       WHERE jp.job_type = ANY($${typesIdx}::text[])
         ${jpNotDeletedSql}
         AND ${listedSql}
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
       ORDER BY jp.created_at DESC`;

    if (/program_applications|applied_at/i.test(msg)) {
      return query(fallbackSql, [...tenantInParams, userId, types]);
    }
    throw e;
  }
}

function opportunityErrorHint(error) {
  const msg = String(error?.message || '');
  if (error?.code === '42703' || /college_status|is_deleted|does not exist/i.test(msg)) {
    return 'Run npm run db:migrate:066 and npm run db:migrate:067, then reload.';
  }
  if (error?.code === '42P01' || /program_applications|job_posting_visibility/i.test(msg)) {
    return 'Run npm run db:migrate:006 (program_applications + visibility), then reload.';
  }
  if (/too many clients|max clients/i.test(msg)) {
    return 'Database connection limit reached. Wait a moment and refresh.';
  }
  return undefined;
}






/**
 * Published program openings visible to the student's college.
 * ?kind=internship | job | project (short_project only) | hackathon
 */
async function __platform_GET(request) {
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

    const { searchParams } = new URL(request.url);
    const kindParam = searchParams.get('kind');
    const kind =
      kindParam === 'project'
        ? 'project'
        : kindParam === 'job'
          ? 'job'
          : kindParam === 'hackathon'
            ? 'hackathon'
            : 'internship';

    const isAlumni = await resolveAlumniStudentFlag(userId, session.user);
    if (kind === 'job' && !isAlumni) return alumniJobsForbiddenResponse();
    if (kind !== 'job' && isAlumni) return campusProgramsForbiddenForAlumniResponse();

    const types =
      kind === 'project'
        ? ['short_project']
        : kind === 'hackathon'
          ? ['hackathon']
          : kind === 'job'
            ? ALUMNI_JOB_TYPES
            : ['internship'];

    const studentProfileId = await getOrCreateStudentProfileId(userId);
    const tenantIdForGate = tenantIds[0] || sessionTenant || null;
    const applyGate = studentProfileId
      ? await getStudentApplyGate(studentProfileId, tenantIdForGate)
      : { hasResume: false, placementLocked: false, canApply: false, applyBlockedReason: null };
    const cvVerificationGate =
      kind === 'internship' && studentProfileId
        ? await getStudentCampusCvVerificationGate(studentProfileId, tenantIdForGate)
        : { required: false, hasVerifiedCv: true, applyBlockedReason: null };
    const mergedApplyGate =
      kind === 'internship'
        ? mergeCampusCvVerificationApplyGate(applyGate, cvVerificationGate)
        : applyGate;
    const browseGate = studentProfileId
      ? await getStudentBrowseGate(studentProfileId, tenantIdForGate)
      : {
          canBrowseListings: false,
          profileComplete: false,
          hasResume: false,
          browseGateTitle: 'Complete your profile and upload your CV',
          browseGateMessage: null,
          profileMissingLabels: [],
        };

    const applyProfile = studentProfileId
      ? await loadStudentApplyProfile(studentProfileId, tenantIdForGate)
      : null;

    const internshipLock =
      kind === 'internship' && studentProfileId
        ? await getStudentInternshipSelectionLock(studentProfileId)
        : { locked: false, selectedJobId: null, selection: null };

    const cached = getStudentOpportunityListCache(tenantIds, kind);
    const cachedItems = Array.isArray(cached?.payload?.items) ? cached.payload.items : null;

    const collegeApprovedSql = await jobVisibilityCollegeApprovedSql();
    const listedSql = studentListedJobPostingSql('jp');
    const paNotDeletedSql = await programApplicationNotDeletedSql('pa');
    const jpNotDeletedSql = await jobPostingNotDeletedSql('jp');

    const { sql: tenantInSql, params: tenantInParams } = uuidInClause(tenantIds, 1);
    const userIdx = 1 + tenantInParams.length;
    const typesIdx = userIdx + 1;

    const result = cachedItems
      ? null
      : await queryStudentProgramOpportunities({
          tenantInParams,
          tenantInSql,
          userIdx,
          typesIdx,
          userId,
          types,
          listedSql,
          jpNotDeletedSql,
          paNotDeletedSql,
          collegeApprovedSql,
        });

    const allItems = cachedItems ?? result.rows.map(mapProgramOpportunityRow);

    if (!cachedItems && browseGate.canBrowseListings) {
      setStudentOpportunityListCache(tenantIds, kind, { kind, items: allItems });
    }

    let items = allItems;
    let notProcessedCount = 0;

    if (kind === 'internship' && internshipLock.locked && internshipLock.selectedJobId) {
      items = allItems.filter((row) => row.id === internshipLock.selectedJobId);
      if (!items.length && internshipLock.selection) {
        items = [
          {
            id: internshipLock.selection.jobId,
            title: internshipLock.selection.title,
            description: '',
            jobType: 'internship',
            salaryMin: null,
            salaryMax: null,
            minCgpa: null,
            vacancies: null,
            skillsRequired: [],
            applicationDeadline: null,
            createdAt: null,
            employerId: null,
            companyName: internshipLock.selection.companyName,
            website: internshipLock.selection.website,
            hasApplied: true,
            applicationStatus: internshipLock.selection.status,
          },
        ];
      }
      notProcessedCount = allItems.filter(
        (row) => row.id !== internshipLock.selectedJobId && !row.hasApplied,
      ).length;
    }

    const internshipLocked = kind === 'internship' && internshipLock.locked;
    const canApplyInternship = mergedApplyGate.canApply && !internshipLocked;
    let applyBlockedReason = mergedApplyGate.applyBlockedReason;
    if (internshipLocked && canApplyInternship === false) {
      applyBlockedReason = STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE;
    }

    const responsePayload = {
      kind,
      canApply: kind === 'internship' ? canApplyInternship : applyGate.canApply,
      hasResume: browseGate.hasResume,
      profileComplete: browseGate.profileComplete,
      canBrowseListings: browseGate.canBrowseListings,
      browseGateTitle: browseGate.browseGateTitle,
      browseGateMessage: browseGate.browseGateMessage,
      profileMissingLabels: browseGate.profileMissingLabels,
      placementLocked: applyGate.placementLocked,
      applyBlockedReason,
      cvVerificationRequired: kind === 'internship' ? cvVerificationGate.required : false,
      hasVerifiedCv: kind === 'internship' ? cvVerificationGate.hasVerifiedCv : true,
      internshipLocked,
      selectedInternship: internshipLock.selection,
      notProcessedCount: browseGate.canBrowseListings ? notProcessedCount : 0,
      currentStudent: applyProfile
        ? {
            cgpa: applyProfile.cgpa,
            branch: applyProfile.branch,
            department: applyProfile.department,
            batchYear: applyProfile.batchYear,
            backlogsActive: applyProfile.backlogsActive,
            hasResume: applyProfile.hasResume,
            isPlacementLocked: applyProfile.isPlacementLocked,
            cvVerificationRequired: applyProfile.cvVerificationRequired,
            hasVerifiedCv: applyProfile.hasVerifiedCv,
          }
        : {
            cgpa: null,
            branch: '',
            department: '',
            batchYear: null,
            backlogsActive: 0,
            hasResume: browseGate.hasResume,
            isPlacementLocked: applyGate.placementLocked,
            cvVerificationRequired: kind === 'internship' ? cvVerificationGate.required : false,
            hasVerifiedCv: kind === 'internship' ? cvVerificationGate.hasVerifiedCv : true,
          },
      items: browseGate.canBrowseListings ? items : [],
    };

    return NextResponse.json(responsePayload);
  } catch (e) {
    console.error('GET /api/student/program-opportunities', e);
    const hint = opportunityErrorHint(e);
    return NextResponse.json(
      { error: 'Failed to load opportunities', ...(hint ? { hint } : {}) },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_program_opportunities' });
export const GET = __platformApiHandlers.GET;
