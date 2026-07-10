import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getStudentApplyGate } from '@/lib/studentApplyEligibility';
import { loadStudentApplyProfile } from '@/lib/studentApplyProfile';
import { getStudentBrowseGate } from '@/lib/studentBrowseGate';
import { mergeCampusCvVerificationApplyGate } from '@/lib/collegeCvVerification';
import { getStudentCampusCvVerificationGate } from '@/lib/studentCv';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { campusProgramsForbiddenForAlumniResponse, isAlumniStudent } from '@/lib/studentAlumni';
import { mapStudentDriveListRow } from '@/lib/placementDriveJobFields';
import { DRIVE_APPLICANT_COUNT_SUBQUERY } from '@/lib/employerApplicationCounts';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

const STUDENT_DRIVE_JOB_COLUMNS = `
        d.salary_min,
        d.salary_max,
        d.eligible_branches,
        d.max_backlogs,
        d.batch_year,
        d.skills_required,
        d.additional_info,
        d.application_deadline,
        d.job_type`;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAlumniStudent(session.user)) {
      return campusProgramsForbiddenForAlumniResponse();
    }

    const studentProfileId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentProfileId) {
      return NextResponse.json({
        drives: [],
        canApply: false,
        hasResume: false,
        placementLocked: false,
        applyBlockedReason: null,
      });
    }

    const applyGate = await getStudentApplyGate(studentProfileId, session.user.tenantId);
    const cvVerificationGate = await getStudentCampusCvVerificationGate(
      studentProfileId,
      session.user.tenantId,
    );
    const mergedApplyGate = mergeCampusCvVerificationApplyGate(applyGate, cvVerificationGate);
    const browseGate = await getStudentBrowseGate(studentProfileId, session.user.tenantId);

    const applyProfile = await loadStudentApplyProfile(studentProfileId, session.user.tenantId);

    const driveSqlFull = `
      SELECT
        d.id,
        ep.company_name AS company,
        ep.website AS website,
        d.title AS role,
        d.drive_date AS date,
        d.drive_type AS type,
        d.venue,
        d.status,
        d.description,
        d.max_students AS vacancies,
        ${DRIVE_APPLICANT_COUNT_SUBQUERY} AS registered,
        d.min_cgpa,
        ${STUDENT_DRIVE_JOB_COLUMNS},
        a.status AS application_status,
        (a.status IS NOT NULL AND a.status IN ('applied', 'shortlisted', 'in_progress', 'selected', 'on_hold')) AS applied
      FROM placement_drives d
      JOIN employer_profiles ep ON d.employer_id = ep.id
      LEFT JOIN applications a
        ON a.drive_id = d.id
       AND a.student_id = $1
       AND COALESCE(a.is_deleted, false) = false
      WHERE d.tenant_id = $2
        AND d.status IN ('approved', 'scheduled')
        AND COALESCE(d.is_deleted, false) = false
      ORDER BY d.drive_date ASC, d.created_at DESC
    `;
    const driveSqlLegacy = driveSqlFull
      .replace(`${STUDENT_DRIVE_JOB_COLUMNS},\n`, '')
      .replace('        d.min_cgpa,\n', '');

    let res;
    try {
      res = await query(driveSqlFull, [studentProfileId, session.user.tenantId]);
    } catch (err) {
      if (err?.code !== '42703') throw err;
      const msg = String(err?.message || '');
      if (msg.includes('min_cgpa') || msg.includes('salary_min') || msg.includes('job_type')) {
        try {
          res = await query(
            driveSqlFull.replace(`${STUDENT_DRIVE_JOB_COLUMNS},\n`, ''),
            [studentProfileId, session.user.tenantId],
          );
        } catch (err2) {
          if (err2?.code !== '42703') throw err2;
          res = await query(driveSqlLegacy, [studentProfileId, session.user.tenantId]);
        }
      } else {
        throw err;
      }
    }

    const driveRows = browseGate.canBrowseListings
      ? res.rows.map((row) => mapStudentDriveListRow(row))
      : [];

    return NextResponse.json({
      canApply: mergedApplyGate.canApply,
      hasResume: browseGate.hasResume,
      profileComplete: browseGate.profileComplete,
      canBrowseListings: browseGate.canBrowseListings,
      browseGateTitle: browseGate.browseGateTitle,
      browseGateMessage: browseGate.browseGateMessage,
      profileMissingLabels: browseGate.profileMissingLabels,
      placementLocked: applyGate.placementLocked,
      applyBlockedReason: mergedApplyGate.applyBlockedReason,
      cvVerificationRequired: cvVerificationGate.required,
      hasVerifiedCv: cvVerificationGate.hasVerifiedCv,
      currentStudent: {
        cgpa: applyProfile.cgpa,
        branch: applyProfile.branch,
        department: applyProfile.department,
        batchYear: applyProfile.batchYear,
        backlogsActive: applyProfile.backlogsActive,
        hasResume: applyProfile.hasResume,
        isPlacementLocked: applyProfile.isPlacementLocked,
        cvVerificationRequired: applyProfile.cvVerificationRequired,
        hasVerifiedCv: applyProfile.hasVerifiedCv,
      },
      drives: driveRows,
    });
  } catch (error) {
    console.error('GET /api/student/drives', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_drives' });
export const GET = __platformApiHandlers.GET;
