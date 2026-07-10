import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE, isWithdrawnApplicationStatus } from '@/lib/applicationWithdrawal';
import { toDateOnlyString, validateDriveDateForApply } from '@/lib/dateOnly';
import { getApplyBlockReason } from '@/lib/getApplyBlockReason';
import { driveEligibilityOpportunity } from '@/lib/placementDriveJobFields';
import { assertStudentMayApplyToPlacement } from '@/lib/studentApplyEligibility';
import { loadStudentApplyProfile } from '@/lib/studentApplyProfile';
import { getOrCreateStudentProfileId, isStudentProfileArchived } from '@/lib/studentServer';
import { assertActiveEmployerTieUp } from '@/lib/employerTieUp';
import { campusProgramsForbiddenForAlumniResponse, isAlumniStudent } from '@/lib/studentAlumni';
import { syncPlacementDriveRegisteredCount, syncPlacementDriveSelectedCount } from '@/lib/employerApplicationCounts';
import { applicationStatusFromHiringResult } from '@/lib/hiringResult';
import { notifyStudentApplicationSubmitted } from '@/lib/studentApplicationSubmittedNotify';
import { hasColumn } from '@/lib/migrationReady';
import { resolveCvForApplication, assertStudentCvVerifiedForCampusApply } from '@/lib/studentCv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAlumniStudent(session.user)) {
      return campusProgramsForbiddenForAlumniResponse();
    }

    const userId = session.user.id;
    const apps = await query(
      `
      SELECT
        a.id,
        a.drive_id,
        a.status,
        a.current_round,
        a.applied_at,
        d.drive_date,
        ep.company_name AS company,
        ep.website AS website,
        d.title AS role,
        'placement_drive'::text AS job_type
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN placement_drives d ON a.drive_id = d.id
      JOIN employer_profiles ep ON d.employer_id = ep.id
      WHERE sp.user_id = $1
        AND COALESCE(a.is_deleted, false) = false
        AND COALESCE(d.is_deleted, false) = false
      ORDER BY a.applied_at DESC
      `,
      [userId],
    );

    return NextResponse.json({
      items: apps.rows.map((row) => ({
        id: row.id,
        drive_id: row.drive_id,
        company: row.company,
        website: row.website || null,
        role: row.role,
        status: row.status,
        currentRound: row.current_round,
        appliedAt: row.applied_at,
        driveDate: row.drive_date,
        jobType: row.job_type || 'placement_drive',
      })),
    });
  } catch (error) {
    console.error('GET /api/student/applications', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAlumniStudent(session.user)) {
      return campusProgramsForbiddenForAlumniResponse();
    }

    const userId = session.user.id;
    const { drive_id, location_preference, cvId } = await req.json();

    if (!drive_id) {
      return NextResponse.json({ error: 'Drive ID required' }, { status: 400 });
    }

    if (await isStudentProfileArchived(userId)) {
      return NextResponse.json(
        { error: 'Your student account has been archived. Contact your placement office if this is a mistake.' },
        { status: 403 },
      );
    }

    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({
        error: 'Student profile not found. Complete profile setup before applying.',
      }, { status: 400 });
    }

    const profileTenant = await query(`SELECT tenant_id FROM student_profiles WHERE id = $1::uuid LIMIT 1`, [studentId]);
    const applyGate = await assertStudentMayApplyToPlacement(studentId, profileTenant.rows[0]?.tenant_id);
    if (!applyGate.ok) {
      return NextResponse.json({ error: applyGate.error }, { status: 403 });
    }

    const notes = location_preference ? `Preferred Location: ${location_preference}` : null;

    try {
      const meta = await query(
        `SELECT d.id, d.drive_date, d.employer_id, d.status AS drive_status,
                d.min_cgpa, d.max_backlogs, d.batch_year, d.eligible_branches, d.application_deadline,
                sp.tenant_id, sp.cgpa AS student_cgpa
         FROM placement_drives d
         CROSS JOIN student_profiles sp
         WHERE d.id = $1 AND sp.id = $2
           AND COALESCE(d.is_deleted, false) = false`,
        [drive_id, studentId]
      ).catch(async (err) => {
        if (err?.code !== '42703') throw err;
        const msg = String(err?.message || '');
        if (msg.includes('max_backlogs') || msg.includes('eligible_branches') || msg.includes('application_deadline')) {
          return query(
            `SELECT d.id, d.drive_date, d.employer_id, d.status AS drive_status, d.min_cgpa,
                    sp.tenant_id, sp.cgpa AS student_cgpa
             FROM placement_drives d
             CROSS JOIN student_profiles sp
             WHERE d.id = $1 AND sp.id = $2
               AND COALESCE(d.is_deleted, false) = false`,
            [drive_id, studentId],
          );
        }
        if (msg.includes('min_cgpa')) {
          return query(
            `SELECT d.id, d.drive_date, d.employer_id, d.status AS drive_status,
                    sp.tenant_id, sp.cgpa AS student_cgpa
             FROM placement_drives d
             CROSS JOIN student_profiles sp
             WHERE d.id = $1 AND sp.id = $2
               AND COALESCE(d.is_deleted, false) = false`,
            [drive_id, studentId],
          );
        }
        throw err;
      });

      if (meta.rowCount === 0) {
        return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
      }

      const { drive_date, employer_id, tenant_id: studentTenantId } = meta.rows[0];
      if (employer_id && studentTenantId) {
        const tieUp = await assertActiveEmployerTieUp(studentTenantId, employer_id);
        if (!tieUp.ok) {
          return NextResponse.json({ error: tieUp.error }, { status: 403 });
        }
      }
      const driveDateYmd = toDateOnlyString(drive_date);
      const driveDateCheck = validateDriveDateForApply(driveDateYmd);
      if (!driveDateCheck.ok) {
        return NextResponse.json({ error: driveDateCheck.error }, { status: 400 });
      }

      const driveRow = meta.rows[0];
      const applyProfile = await loadStudentApplyProfile(studentId, studentTenantId);
      const blockReason = getApplyBlockReason(
        driveEligibilityOpportunity(driveRow),
        applyProfile,
        { openStatuses: ['approved', 'scheduled'] },
      );
      if (blockReason) {
        return NextResponse.json({ error: blockReason }, { status: 400 });
      }

      const cvGate = await resolveCvForApplication(studentId, cvId);
      if (!cvGate.ok) {
        return NextResponse.json({ error: cvGate.error }, { status: 400 });
      }

      const cvVerifyGate = await assertStudentCvVerifiedForCampusApply(
        studentId,
        studentTenantId,
        cvGate.studentCvId,
      );
      if (!cvVerifyGate.ok) {
        return NextResponse.json({ error: cvVerifyGate.error }, { status: 403 });
      }

      const existing = await query(
        `SELECT status FROM applications
         WHERE student_id = $1::uuid AND drive_id = $2::uuid
           AND COALESCE(is_deleted, false) = false
         LIMIT 1`,
        [studentId, drive_id],
      );
      if (existing.rows.length && isWithdrawnApplicationStatus(existing.rows[0].status)) {
        return NextResponse.json({ error: WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE }, { status: 409 });
      }

      const assessmentRes = await query(
        `SELECT ear.id, ear.hiring_result
         FROM employer_assessment_rows ear
         JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
         WHERE ear.student_profile_id = $1::uuid
           AND eau.drive_id = $2::uuid
           AND COALESCE(eau.is_deleted, false) = false
         ORDER BY eau.created_at DESC, ear.created_at DESC
         LIMIT 1`,
        [studentId, drive_id]
      );
      const assessmentRow = assessmentRes.rows[0];
      let initialStatus = 'applied';
      if (assessmentRow?.hiring_result) {
        const mapped = applicationStatusFromHiringResult(assessmentRow.hiring_result);
        if (mapped) {
          initialStatus = mapped;
        }
      }

      const hasCvCol = await hasColumn('applications', 'student_cv_id');
      const ins = await query(
        hasCvCol
          ? `
        INSERT INTO applications (student_id, drive_id, job_id, status, notes, student_cv_id)
        VALUES ($1, $2, $3, $4, $5, $6::uuid)
        ON CONFLICT (student_id, drive_id)
        DO UPDATE SET
          status = $4,
          notes = COALESCE(EXCLUDED.notes, applications.notes),
          student_cv_id = COALESCE(EXCLUDED.student_cv_id, applications.student_cv_id),
          updated_at = NOW()
        WHERE applications.status <> 'withdrawn'
        RETURNING id
      `
          : `
        INSERT INTO applications (student_id, drive_id, job_id, status, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_id, drive_id)
        DO UPDATE SET
          status = $4,
          notes = COALESCE(EXCLUDED.notes, applications.notes),
          updated_at = NOW()
        WHERE applications.status <> 'withdrawn'
        RETURNING id
      `,
        hasCvCol
          ? [studentId, drive_id, null, initialStatus, notes, cvGate.studentCvId || null]
          : [studentId, drive_id, null, initialStatus, notes],
      );

      if (ins.rowCount === 0) {
        const withdrawn = await query(
          `SELECT 1 FROM applications
           WHERE student_id = $1::uuid AND drive_id = $2::uuid AND status = 'withdrawn'
             AND COALESCE(is_deleted, false) = false
           LIMIT 1`,
          [studentId, drive_id],
        );
        if (withdrawn.rowCount) {
          return NextResponse.json({ error: WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE }, { status: 409 });
        }
        return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
      }

      if (assessmentRow && ins.rows[0]?.id) {
        await query(
          `UPDATE employer_assessment_rows
           SET application_id = $1::uuid, is_unregistered_student = false
           WHERE id = $2::uuid`,
          [ins.rows[0].id, assessmentRow.id]
        );
        if (initialStatus === 'selected') {
          await syncPlacementDriveSelectedCount(drive_id);
        }
      }

      await syncPlacementDriveRegisteredCount(drive_id);

      try {
        const driveInfo = await query(
          `SELECT d.title, ep.company_name
           FROM placement_drives d
           JOIN employer_profiles ep ON ep.id = d.employer_id
           WHERE d.id = $1::uuid
           LIMIT 1`,
          [drive_id],
        );
        const driveRow = driveInfo.rows[0];
        const firstName = String(session.user.name || '').trim().split(/\s+/)[0] || '';
        await notifyStudentApplicationSubmitted({
          studentUserId: userId,
          email: session.user.email,
          firstName,
          companyName: driveRow?.company_name,
          roleTitle: driveRow?.title,
          jobType: 'placement_drive',
          applicationId: ins.rows[0]?.id,
          sourceKind: 'drive',
        });
      } catch (notifyErr) {
        console.error('Failed to notify student of drive application submission', notifyErr);
      }

      return NextResponse.json({ success: true, message: 'Application submitted successfully' });
    } catch (dbError) {
      console.error('DB Insert failed:', dbError);
      return NextResponse.json({ error: 'Could not save application' }, { status: 500 });
    }
  } catch (error) {
    console.error('Application API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_student_applications' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
