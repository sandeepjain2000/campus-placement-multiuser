import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import { fetchAssessmentRowsForView, pickRepresentativeAssessmentRows } from '@/lib/assessmentHiringView';
import {
  ASSESSMENT_UPLOAD_STARTER_FILENAME,
  buildAssessmentUploadStarterCsv,
  defaultHiringResultCells,
} from '@/lib/assessmentUploadStarterCsv';
import { formatStudentSystemIdForCollege } from '@/lib/studentSystemId';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { loadAppliedStudentProfileIds } from '@/lib/assessmentApplicationStatus';
import {
  filterStudentsByAssessmentPostingEligibility,
  loadAssessmentPostingOpportunity,
} from '@/lib/assessmentExportEligibility';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function employerHasApprovedTenant(employerId, tenantId) {
  const r = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [employerId, tenantId],
  );
  return r.rows.length > 0;
}

async function listStarterStudents({ tenantId, driveId, scope }) {
  if (scope === 'applicants' && driveId) {
    const applicants = await query(
      `SELECT DISTINCT ON (sp.id)
              sp.id AS student_profile_id,
              sp.roll_number,
              sp.cgpa,
              sp.branch,
              sp.department,
              sp.batch_year,
              sp.backlogs_active,
              sp.placement_status,
              sp.resume_url,
              EXISTS (
                SELECT 1 FROM student_documents sd
                WHERE sd.student_id = sp.id
                  AND LOWER(TRIM(sd.document_type)) IN ('resume', 'cv')
                  AND sd.file_url ~* '^https?://'
              ) AS has_resume_document,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS candidate_name
       FROM applications a
       JOIN student_profiles sp ON sp.id = a.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       WHERE a.drive_id = $1::uuid
         ${AND_APP_NOT_DELETED}
         AND sp.tenant_id = $2::uuid
         AND ${SP_ACTIVE_CLAUSE}
         AND sp.roll_number IS NOT NULL
         AND TRIM(sp.roll_number) <> ''
       ORDER BY sp.id, TRIM(sp.roll_number) ASC NULLS LAST`,
      [driveId, tenantId],
    );
    if (applicants.rows.length) return applicants.rows;
  }

  const students = await query(
    `SELECT sp.id AS student_profile_id,
            sp.roll_number,
            sp.cgpa,
            sp.branch,
            sp.department,
            sp.batch_year,
            sp.backlogs_active,
            sp.placement_status,
            sp.resume_url,
            EXISTS (
              SELECT 1 FROM student_documents sd
              WHERE sd.student_id = sp.id
                AND LOWER(TRIM(sd.document_type)) IN ('resume', 'cv')
                AND sd.file_url ~* '^https?://'
            ) AS has_resume_document,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS candidate_name
     FROM student_profiles sp
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE sp.tenant_id = $1::uuid
       AND ${SP_ACTIVE_CLAUSE}
       AND sp.roll_number IS NOT NULL
       AND TRIM(sp.roll_number) <> ''
     ORDER BY TRIM(sp.roll_number) ASC NULLS LAST
     LIMIT 500`,
    [tenantId],
  );
  return students.rows;
}

/**
 * GET — assessment upload CSV pre-filled with real campus students (and existing hiring_result when any).
 * Query: driveId (placement drive) OR jobId + tenantId (job/internship — both placement_drive_id and job_id pre-filled with jobId).
 * Optional: scope=applicants (drive only — prefer drive applicants, else all campus students).
 */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const driveId = url.searchParams.get('driveId');
    const jobId = url.searchParams.get('jobId');
    const tenantParam = url.searchParams.get('tenantId');
    const scope = url.searchParams.get('scope') === 'applicants' ? 'applicants' : 'campus';

    let tenantId = null;
    let placementDriveId = '';
    let resolvedJobId = '';
    let assessmentKind = 'drive';

    if (driveId && isUuid(driveId)) {
      const drive = await query(
        `SELECT id, tenant_id, job_id
         FROM placement_drives d
         WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED}
         LIMIT 1`,
        [driveId, employerId],
      );
      if (!drive.rows.length) {
        return NextResponse.json({ error: 'Drive not found for this employer' }, { status: 404 });
      }
      tenantId = drive.rows[0].tenant_id;
      placementDriveId = driveId;
    } else if (jobId && isUuid(jobId) && tenantParam && isUuid(tenantParam)) {
      if (!(await employerHasApprovedTenant(employerId, tenantParam))) {
        return NextResponse.json({ error: 'Invalid or unapproved campus' }, { status: 403 });
      }
      const job = await query(
        `SELECT id, job_type FROM job_postings jp WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid ${AND_JP_NOT_DELETED} LIMIT 1`,
        [jobId, employerId],
      );
      if (!job.rows.length) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      const jobType = job.rows[0].job_type;
      if (jobType === 'internship') assessmentKind = 'internship';
      else if (jobType === 'short_project' || jobType === 'hackathon') assessmentKind = 'projects';
      else assessmentKind = 'jobs';
      tenantId = tenantParam;
      placementDriveId = jobId;
      resolvedJobId = jobId;
    } else {
      return NextResponse.json(
        { error: 'Provide driveId, or jobId and tenantId, to build a starter CSV for your campus students.' },
        { status: 400 },
      );
    }

    if (!(await employerHasApprovedTenant(employerId, tenantId))) {
      return NextResponse.json({ error: 'Employer is not approved for this campus' }, { status: 403 });
    }

    const tenantRes = await query(`SELECT short_code, name FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const tenant = tenantRes.rows[0] || {};

    let studentRows = await listStarterStudents({
      tenantId,
      driveId: placementDriveId || null,
      scope,
    });

    if (!studentRows.length) {
      return NextResponse.json({ error: 'No students with roll numbers found for this campus.' }, { status: 404 });
    }

    const opportunity = await loadAssessmentPostingOpportunity(employerId, assessmentKind, {
      tenantId,
      driveId: placementDriveId || null,
      jobId: resolvedJobId || null,
    });
    const filtered = await filterStudentsByAssessmentPostingEligibility(
      studentRows,
      opportunity,
      tenantId,
      assessmentKind,
      { jobId: resolvedJobId || null },
    );
    studentRows = filtered.students;

    if (!studentRows.length) {
      return NextResponse.json(
        { error: 'No eligible students found for this campus and posting criteria.' },
        { status: 404 },
      );
    }

    studentRows.sort((a, b) =>
      String(a.roll_number || '').localeCompare(String(b.roll_number || ''), undefined, { numeric: true }),
    );

    const assessRows = await fetchAssessmentRowsForView({ employerId, tenantId });
    const rep = pickRepresentativeAssessmentRows(assessRows);
    const byProfile = new Map();
    for (const r of rep) {
      const matchesDrive = placementDriveId && r.upload_drive_id === placementDriveId;
      const matchesJob = resolvedJobId && r.upload_job_id === resolvedJobId;
      if (!matchesDrive && !matchesJob) continue;
      byProfile.set(r.student_profile_id, r);
    }
    const profileIds = studentRows.map((s) => s.student_profile_id).filter(Boolean);
    const appliedProfileIds = await loadAppliedStudentProfileIds(profileIds, {
      driveId: placementDriveId || null,
      jobId: resolvedJobId || null,
    });

    const csvRows = studentRows.map((s) => {
      const assessment = byProfile.get(s.student_profile_id);
      const cells = defaultHiringResultCells(assessment, {
        hasApplied: appliedProfileIds.has(s.student_profile_id),
      });
      const name = String(s.candidate_name || '').trim();
      return {
        student_system_id: formatStudentSystemIdForCollege(tenant, s.roll_number),
        college_roll_no: s.roll_number,
        placement_drive_id: placementDriveId,
        job_id: resolvedJobId,
        tenant_id: tenantId,
        candidate_name: name,
        ...cells,
      };
    });

    const csv = `\uFEFF${buildAssessmentUploadStarterCsv(csvRows)}`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${ASSESSMENT_UPLOAD_STARTER_FILENAME}"`,
      },
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/starter', e);
    return NextResponse.json({ error: 'Failed to build assessment starter CSV' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_starter' });
export const GET = __platformApiHandlers.GET;
