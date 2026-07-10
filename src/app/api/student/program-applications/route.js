import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getApplyBlockReason, postingEligibilityFromJobRow } from '@/lib/getApplyBlockReason';
import {
  assertStudentMayApplyToPlacement,
  assertStudentResumeForApply,
} from '@/lib/studentApplyEligibility';
import { loadStudentApplyProfile } from '@/lib/studentApplyProfile';
import { WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE, isWithdrawnApplicationStatus } from '@/lib/applicationWithdrawal';
import { assertStudentMayApplyToInternship } from '@/lib/internshipPlacementRules';
import { assertActiveEmployerTieUp } from '@/lib/employerTieUp';
import { getOrCreateStudentProfileId, isStudentProfileArchived } from '@/lib/studentServer';
import { resolveStudentPlacementTenantIds } from '@/lib/sessionTenant';
import { uuidInClause } from '@/lib/sqlPlaceholders';
import { hasColumn, jobPostingNotDeletedSql, jobVisibilityCollegeApprovedSql, programApplicationNotDeletedSql } from '@/lib/migrationReady';
import {
  ALUMNI_JOB_TYPES,
  CAMPUS_PROGRAM_JOB_TYPES,
  alumniJobsForbiddenResponse,
  campusProgramsForbiddenForAlumniResponse,
  isAlumniJobType,
} from '@/lib/studentAlumni';
import { resolveAlumniStudentFlag } from '@/lib/studentAlumniServer';
import { applicationStatusFromHiringResult } from '@/lib/hiringResult';
import { createServerDebugTracer } from '@/lib/serverDebugTracer';
import { notifyStudentApplicationSubmitted } from '@/lib/studentApplicationSubmittedNotify';
import { resolveCvForApplication, assertStudentCvVerifiedForCampusApply } from '@/lib/studentCv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

const PROGRAM_TYPES = new Set([
  ...ALUMNI_JOB_TYPES,
  ...CAMPUS_PROGRAM_JOB_TYPES,
]);

async function persistProgramApplication(studentId, jobId, notes, tracer = null, studentCvId = null) {
  const t = tracer || { log: () => {} };
  const hasDeletedCol = await hasColumn('program_applications', 'is_deleted');
  t.log('persistProgramApplication', 'check_prior_application', { studentId, jobId });
  const prior = await query(
    `SELECT id, status${hasDeletedCol ? ', COALESCE(is_deleted, false) AS is_deleted' : ''}
     FROM program_applications
     WHERE student_id = $1::uuid AND job_id = $2::uuid
     LIMIT 1`,
    [studentId, jobId],
  );
  t.log('persistProgramApplication', 'prior_application_result', {
    found: prior.rows.length > 0,
    existing: prior.rows[0] ? { id: prior.rows[0].id, status: prior.rows[0].status } : null,
  });

  t.log('persistProgramApplication', 'query_assessment_rows', { studentId, jobId });
  const assessmentRes = await query(
    `SELECT ear.id, ear.hiring_result
     FROM employer_assessment_rows ear
     JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
     WHERE ear.student_profile_id = $1::uuid
       AND eau.job_id = $2::uuid
       AND COALESCE(eau.is_deleted, false) = false
     ORDER BY eau.created_at DESC, ear.created_at DESC
     LIMIT 1`,
    [studentId, jobId]
  );
  const assessmentRow = assessmentRes.rows[0];
  t.log('persistProgramApplication', 'assessment_rows_result', {
    found: !!assessmentRow,
    hiring_result: assessmentRow?.hiring_result ?? null,
  });

  let initialStatus = 'applied';
  if (assessmentRow?.hiring_result) {
    const mapped = applicationStatusFromHiringResult(assessmentRow.hiring_result);
    t.log('persistProgramApplication', 'hiring_result_mapped', {
      raw: assessmentRow.hiring_result,
      mapped,
    });
    if (mapped) initialStatus = mapped;
  }
  t.log('persistProgramApplication', 'computed_initial_status', { initialStatus });

  if (prior.rows.length) {
    const existing = prior.rows[0];
    if (isWithdrawnApplicationStatus(existing.status)) {
      t.log('persistProgramApplication', 'blocked_withdrawn', { existingStatus: existing.status });
      return { ok: false, status: 409, error: WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE };
    }
    if (hasDeletedCol && existing.is_deleted) {
      t.log('persistProgramApplication', 'reviving_deleted_application', { id: existing.id, newStatus: initialStatus });
      const revived = await query(
        (await hasColumn('program_applications', 'student_cv_id'))
          ? `UPDATE program_applications
         SET status = $3,
             notes = COALESCE($4, notes),
             student_cv_id = COALESCE($5::uuid, student_cv_id),
             is_deleted = false,
             updated_at = NOW(),
             applied_at = COALESCE(applied_at, NOW())
         WHERE student_id = $1::uuid AND job_id = $2::uuid
         RETURNING id, status`
          : `UPDATE program_applications
         SET status = $3,
             notes = COALESCE($4, notes),
             is_deleted = false,
             updated_at = NOW(),
             applied_at = COALESCE(applied_at, NOW())
         WHERE student_id = $1::uuid AND job_id = $2::uuid
         RETURNING id, status`,
        (await hasColumn('program_applications', 'student_cv_id'))
          ? [studentId, jobId, initialStatus, notes || null, studentCvId || null]
          : [studentId, jobId, initialStatus, notes || null],
      );
      if (!revived.rowCount) {
        t.log('persistProgramApplication', 'revive_failed');
        return { ok: false, status: 500, error: 'Could not submit application' };
      }
      const revivedId = revived.rows[0].id;
      t.log('persistProgramApplication', 'revive_success', { id: revivedId, status: revived.rows[0].status });
      if (assessmentRow) {
        t.log('persistProgramApplication', 'linking_assessment_on_revive', { assessmentId: assessmentRow.id, applicationId: revivedId });
        await query(
          `UPDATE employer_assessment_rows
           SET application_id = $1::uuid, is_unregistered_student = false
           WHERE id = $2::uuid`,
          [revivedId, assessmentRow.id]
        );
      }
      return { ok: true, row: revived.rows[0] };
    }
    t.log('persistProgramApplication', 'already_applied', { id: existing.id, status: existing.status });
    if (assessmentRow) {
      t.log('persistProgramApplication', 'linking_assessment_on_already_applied', { assessmentId: assessmentRow.id, applicationId: existing.id });
      await query(
        `UPDATE employer_assessment_rows
         SET application_id = $1::uuid, is_unregistered_student = false
         WHERE id = $2::uuid`,
        [existing.id, assessmentRow.id]
      );
    }
    return { ok: true, row: { id: existing.id, status: existing.status } };
  }

  const hasCvCol = await hasColumn('program_applications', 'student_cv_id');
  t.log('persistProgramApplication', 'inserting_application', { studentId, jobId, initialStatus, studentCvId });
  const inserted = await query(
    hasCvCol
      ? `INSERT INTO program_applications (student_id, job_id, status, notes, student_cv_id)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid)
         RETURNING id, status`
      : `INSERT INTO program_applications (student_id, job_id, status, notes)
         VALUES ($1::uuid, $2::uuid, $3, $4)
         RETURNING id, status`,
    hasCvCol
      ? [studentId, jobId, initialStatus, notes || null, studentCvId || null]
      : [studentId, jobId, initialStatus, notes || null],
  );
  const insertedId = inserted.rows[0]?.id;
  t.log('persistProgramApplication', 'insert_success', { id: insertedId, status: inserted.rows[0]?.status });
  if (assessmentRow && insertedId) {
    t.log('persistProgramApplication', 'linking_assessment_on_insert', { assessmentId: assessmentRow.id, applicationId: insertedId });
    await query(
      `UPDATE employer_assessment_rows
       SET application_id = $1::uuid, is_unregistered_student = false
       WHERE id = $2::uuid`,
      [insertedId, assessmentRow.id]
    );
  }
  return { ok: true, row: inserted.rows[0] };
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAlumni = await resolveAlumniStudentFlag(userId, session.user);
    const allowedTypes = isAlumni ? ALUMNI_JOB_TYPES : CAMPUS_PROGRAM_JOB_TYPES;
    const paNotDeletedSql = await programApplicationNotDeletedSql('pa');

    const result = await query(
      `SELECT
         pa.id,
         pa.status,
         pa.applied_at,
         pa.notes,
         jp.id AS job_id,
         jp.title,
         jp.job_type,
         ep.company_name,
         ep.website
       FROM program_applications pa
       JOIN student_profiles sp ON sp.id = pa.student_id
       LEFT JOIN job_postings jp ON jp.id = pa.job_id
       LEFT JOIN employer_profiles ep ON ep.id = jp.employer_id
       WHERE sp.user_id = $1::uuid
         AND (jp.id IS NULL OR jp.job_type = ANY($2::text[]))
         ${paNotDeletedSql}
       ORDER BY pa.applied_at DESC`,
      [userId, allowedTypes],
    );

    return NextResponse.json({
      items: result.rows.map((r) => ({
        id: r.id,
        status: r.status,
        appliedAt: r.applied_at,
        notes: r.notes,
        jobId: r.job_id,
        title: r.title || 'Role unavailable',
        jobType: r.job_type,
        companyName: r.company_name || 'Company unavailable',
        website: r.website || null,
      })),
    });
  } catch (e) {
    console.error('GET /api/student/program-applications', e);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  const tracer = createServerDebugTracer(req, 'student_program_application');
  tracer.log('__platform_POST', 'request_received');
  let userId = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    tracer.log('__platform_POST', 'session_resolved', { userId, role: session.user.role, sessionTenant });
    const tenantIds = await resolveStudentPlacementTenantIds(userId, sessionTenant);
    if (!userId || !tenantIds.length) {
      return NextResponse.json({ error: 'Missing student context' }, { status: 400 });
    }

    const { jobId, notes, cvId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    if (await isStudentProfileArchived(userId)) {
      return NextResponse.json(
        { error: 'Your student account has been archived. Contact your placement office if this is a mistake.' },
        { status: 403 },
      );
    }

    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      tracer.log('__platform_POST', 'error_no_student_profile');
      await tracer.flush(userId);
      return NextResponse.json({ error: 'Student profile not available' }, { status: 400 });
    }
    tracer.log('__platform_POST', 'student_profile_resolved', { studentId });

    const isAlumni = await resolveAlumniStudentFlag(userId, session.user);
    if (isAlumni) {
      const resumeGate = await assertStudentResumeForApply(studentId);
      if (!resumeGate.ok) {
        return NextResponse.json({ error: resumeGate.error }, { status: 403 });
      }
    } else {
      const applyGate = await assertStudentMayApplyToPlacement(studentId, tenantIds[0] || sessionTenant);
      if (!applyGate.ok) {
        return NextResponse.json({ error: applyGate.error }, { status: 403 });
      }
    }

    const collegeApprovedSql = await jobVisibilityCollegeApprovedSql();
    const jpNotDeletedSql = await jobPostingNotDeletedSql('jp');
    const { sql: tenantInSql, params: tenantInParams } = uuidInClause(tenantIds, 2);
    const job = await query(
      `SELECT jp.id, jp.job_type, jp.status, jp.title, jp.min_cgpa, jp.max_backlogs, jp.eligible_branches,
              jp.batch_year, jp.application_deadline, ep.company_name
       FROM job_postings jp
       INNER JOIN job_posting_visibility jpv
         ON jpv.job_id = jp.id AND jpv.tenant_id IN (${tenantInSql})
         ${collegeApprovedSql}
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN employer_approvals ea
         ON ea.employer_id = ep.id AND ea.tenant_id = jpv.tenant_id AND ea.status = 'approved'
       WHERE jp.id = $1::uuid
         ${jpNotDeletedSql}
       LIMIT 1`,
      [jobId, ...tenantInParams],
    );

    if (!job.rowCount) {
      return NextResponse.json({ error: 'Opening not found or not available for your campus' }, { status: 404 });
    }

    const row = job.rows[0];
    if (isAlumniJobType(row.job_type) && !isAlumni) {
      return alumniJobsForbiddenResponse();
    }
    if (CAMPUS_PROGRAM_JOB_TYPES.includes(row.job_type) && isAlumni) {
      return campusProgramsForbiddenForAlumniResponse();
    }

    const employerIdRes = await query(
      `SELECT jp.employer_id, jpv.tenant_id
       FROM job_postings jp
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
       WHERE jp.id = $1::uuid AND jpv.tenant_id = ANY($2::uuid[])
       LIMIT 1`,
      [jobId, tenantIds],
    );
    const empRow = employerIdRes.rows[0];
    if (empRow?.employer_id && empRow?.tenant_id) {
      const tieUp = await assertActiveEmployerTieUp(empRow.tenant_id, empRow.employer_id);
      if (!tieUp.ok) {
        return NextResponse.json({ error: tieUp.error }, { status: 403 });
      }
    }

    if (row.status !== 'published') {
      return NextResponse.json({ error: 'This opening is not accepting applications' }, { status: 409 });
    }
    if (!PROGRAM_TYPES.has(row.job_type)) {
      return NextResponse.json({ error: 'Invalid program type' }, { status: 400 });
    }

    if (row.job_type === 'internship') {
      const internGate = await assertStudentMayApplyToInternship(studentId, jobId);
      if (!internGate.ok) {
        return NextResponse.json({ error: internGate.error }, { status: 403 });
      }
    }

    const applyProfile = await loadStudentApplyProfile(studentId, tenantIds[0] || sessionTenant);
    const alumniJob = isAlumniJobType(row.job_type);
    const { opportunity } = postingEligibilityFromJobRow(
      alumniJob
        ? {
            ...row,
            min_cgpa: null,
            max_backlogs: null,
            eligible_branches: null,
            batch_year: null,
          }
        : row,
    );
    const blockReason = getApplyBlockReason(
      opportunity,
      {
        ...applyProfile,
        cgpa: applyProfile.cgpa,
        branch: applyProfile.branch,
        department: applyProfile.department,
        batchYear: applyProfile.batchYear,
        backlogsActive: applyProfile.backlogsActive,
        hasResume: applyProfile.hasResume,
        isPlacementLocked: applyProfile.isPlacementLocked,
      },
      { skipCampusPlacementCriteria: alumniJob },
    );
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 400 });
    }

    const cvGate = await resolveCvForApplication(studentId, cvId);
    if (!cvGate.ok) {
      return NextResponse.json({ error: cvGate.error }, { status: 400 });
    }

    if (row.job_type === 'internship') {
      const cvVerifyGate = await assertStudentCvVerifiedForCampusApply(
        studentId,
        tenantIds[0] || sessionTenant,
        cvGate.studentCvId,
      );
      if (!cvVerifyGate.ok) {
        return NextResponse.json({ error: cvVerifyGate.error }, { status: 403 });
      }
    }

    const saved = await persistProgramApplication(studentId, jobId, notes, tracer, cvGate.studentCvId);
    if (!saved.ok) {
      tracer.log('__platform_POST', 'persist_failed', { error: saved.error, status: saved.status });
      await tracer.flush(userId);
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }
    tracer.log('__platform_POST', 'persist_success', { id: saved.row.id, status: saved.row.status });

    try {
      const firstName = String(session.user.name || '').trim().split(/\s+/)[0] || '';
      await notifyStudentApplicationSubmitted({
        studentUserId: userId,
        email: session.user.email,
        firstName,
        companyName: row.company_name,
        roleTitle: row.title,
        jobType: row.job_type,
        applicationId: saved.row.id,
        sourceKind: 'program',
      });
    } catch (err) {
      console.error('Failed to notify student of application submission', err);
    }

    tracer.log('__platform_POST', 'response_sent', { id: saved.row.id, status: saved.row.status });
    await tracer.flush(userId);
    return NextResponse.json({
      success: true,
      id: saved.row.id,
      status: saved.row.status,
    });
  } catch (e) {
    tracer.log('__platform_POST', 'unhandled_exception', { message: e?.message });
    await tracer.flush(userId);
    console.error('POST /api/student/program-applications', e);
    const detail = String(e?.message || '').trim();
    const hint =
      e?.code === '42703' && /backlogs_active|is_alumni|college_status|is_deleted/i.test(detail)
        ? ' A database migration may be missing on the server.'
        : '';
    return NextResponse.json(
      { error: `Could not submit application.${hint}${process.env.NODE_ENV === 'development' && detail ? ` (${detail})` : ''}` },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_student_program_applications' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
