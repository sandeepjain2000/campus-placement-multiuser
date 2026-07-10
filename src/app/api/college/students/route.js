import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { sendStudentWelcomeEmails } from '@/lib/mailer';
import { SANDBOX_DEFAULT_PASSWORD, SANDBOX_PASSWORD_HASH } from '@/lib/sandboxCredentials';
import {


  assertEmailAvailable,
  formatEmailDifferentTenantMessage,
  formatEmailInUseMessage,
} from '@/lib/userEmail';
import { mapCollegeStudentRow, COLLEGE_STUDENT_SELECT_SQL } from '@/lib/collegeStudentMapper';
import { parseCollegeStudentAdminPayload } from '@/lib/collegeStudentAdminFields';
import {
  applyCollegeStudentUserFields,
  replaceStudentSkills,
  upsertCollegeStudentProfileRow,
} from '@/lib/collegeStudentProfileWrite';
import { resolveTenantAcademicYear } from '@/lib/resolveAcademicYearFromRequest';
import { displaySemesterForStudentList } from '@/lib/academicYearTenant';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff, assertCollegeWriter } from '@/lib/collegeAccess';
import { getCollegeCvVerificationSettings } from '@/lib/collegeCvVerification';
import { loadStudentCvVerificationSummaries } from '@/lib/studentCv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeStaff(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const ayContext = await resolveTenantAcademicYear(tenantId, searchParams);
    const displaySem = displaySemesterForStudentList({
      semesters: ayContext.semesters,
      selectedAcademicYear: ayContext.year,
      currentAcademicYear: ayContext.current,
    });
    const semesterDisplay =
      displaySem.sequenceNumber != null ? String(displaySem.sequenceNumber) : displaySem.label;

    const students = await query(
      `SELECT ${COLLEGE_STUDENT_SELECT_SQL}
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.tenant_id = $1 AND ${SP_ACTIVE_CLAUSE}
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [tenantId],
    );

    const rows = students.rows.map((row) => mapCollegeStudentRow(row, { semesterDisplay }));
    const cvSettings = await getCollegeCvVerificationSettings(tenantId);
    const cvSummaries = cvSettings.requireCvVerification
      ? await loadStudentCvVerificationSummaries(rows.map((r) => r.id))
      : new Map();

    const studentsWithCv = rows.map((student) => {
      if (!cvSettings.requireCvVerification) {
        return { ...student, cvStatus: null, activeCvCount: null, verifiedCvCount: null };
      }
      const summary = cvSummaries.get(String(student.id)) || {
        activeCvCount: 0,
        verifiedCvCount: 0,
        cvStatus: 'none',
      };
      return {
        ...student,
        cvStatus: summary.cvStatus,
        activeCvCount: summary.activeCvCount,
        verifiedCvCount: summary.verifiedCvCount,
      };
    });

    return NextResponse.json({
      students: studentsWithCv,
      requireCvVerification: cvSettings.requireCvVerification,
      delegateCvVerificationToCommittee: cvSettings.delegateCvVerificationToCommittee,
      session: {
        academicYearId: ayContext.year?.id || null,
        academicYearLabel: ayContext.year?.label || '',
        semesterLabel: displaySem.label,
        semesterNumber: displaySem.sequenceNumber,
      },
    });
  } catch (error) {
    if (error?.code === '42703') {
      const msg = String(error?.message || '');
      if (msg.includes('archived')) {
        return NextResponse.json(
          {
            error:
              'Database is missing student archive columns. Apply migration db/migrations/052_student_profiles_archived.sql, then retry.',
          },
          { status: 503 },
        );
      }
      if (msg.includes('joining_academic_year')) {
        return NextResponse.json(
          {
            error:
              'Database is missing student batch column. Apply migration db/migrations/053_student_profiles_joining_academic_year.sql, then retry.',
          },
          { status: 503 },
        );
      }
    }
    console.error('Failed to load college students:', error);
    return NextResponse.json(
      { error: 'Failed to load college students' },
      { status: 500 }
    );
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeWriter(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await req.json();
    const tenantRes = await query('SELECT short_code, name FROM tenants WHERE id = $1::uuid', [tenantId]);
    const collegeShortCode = tenantRes.rows[0]?.short_code || '';
    const collegeName = tenantRes.rows[0]?.name || '';
    const parsed = parseCollegeStudentAdminPayload(body, { isEdit: false, collegeShortCode });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { identity, profile, user: userFields, auxProfile, skills: skillsArr } = parsed;
    const { firstName, lastName, fullName, email: normalizedEmail, rollNumber: normalizedRoll, systemId: expectedSystemId } = identity;

    const { studentId, systemId, tempPass, isNew } = await transaction(async (client) => {
      // 1. Check by Roll No within tenant
      const byRoll = await client.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, sp.id as profile_id
         FROM student_profiles sp
         JOIN users u ON u.id = sp.user_id
         WHERE sp.tenant_id = $1 AND LOWER(sp.roll_number) = LOWER($2)
         LIMIT 1`,
        [tenantId, normalizedRoll]
      );

      let userId, profileId;
      let generatedPass = null;
      let isNewStudent = false;

      if (byRoll.rows.length) {
        const ex = byRoll.rows[0];
        const existingName = [ex.first_name, ex.last_name].filter(Boolean).join(' ');

        // Primary field check: Name
        if (existingName.toLowerCase() !== fullName.toLowerCase()) {
          throw new Error(
            `Roll No "${normalizedRoll}" already belongs to "${existingName}". Name cannot be changed.`
          );
        }
        // Primary field check: Email
        if (ex.email.toLowerCase() !== normalizedEmail) {
          throw new Error(
            `Roll No "${normalizedRoll}" is linked to email "${ex.email}". Email cannot be changed.`
          );
        }
        userId = ex.id;
        profileId = ex.profile_id;
      } else {
        try {
          await assertEmailAvailable(client, normalizedEmail, { tenantId });
        } catch (e) {
          if (e.message === 'EMAIL_DIFFERENT_TENANT') {
            throw new Error(formatEmailDifferentTenantMessage(normalizedEmail));
          }
          if (e.message === 'EMAIL_EXISTS') {
            throw new Error(formatEmailInUseMessage(e.existing, { email: normalizedEmail }));
          }
          throw e;
        }

        // New student — create user (sandbox default password)
        generatedPass = SANDBOX_DEFAULT_PASSWORD;
        const commEmail = userFields.communication_email || normalizedEmail;
        const newUser = await client.query(
          `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, phone, avatar_url, is_verified, is_active, email_verified_at)
           VALUES ($1, $2, $3, $4, 'student', $5, $6, $7, $8, true, true, NOW()) RETURNING id`,
          [
            tenantId,
            normalizedEmail,
            commEmail,
            SANDBOX_PASSWORD_HASH,
            firstName,
            lastName,
            userFields.phone,
            userFields.avatar_url,
          ],
        );
        userId = newUser.rows[0].id;
        isNewStudent = true;
      }

      await applyCollegeStudentUserFields(client, userId, userFields);

      const upsert = await upsertCollegeStudentProfileRow(client, {
        userId,
        tenantId,
        rollNumber: normalizedRoll,
        profile,
        auxProfile,
      });
      profileId = upsert.id;

      await replaceStudentSkills(client, profileId, skillsArr);

      return {
        studentId: profileId,
        systemId: expectedSystemId,
        tempPass: generatedPass,
        isNew: isNewStudent,
      };
    });

    // Send welcome email to student if new (same template as CSV bulk import)
    if (isNew && tempPass) {
      try {
        await sendStudentWelcomeEmails({
          loginEmail: normalizedEmail,
          firstName,
          tempPass,
          systemId,
          collegeName,
          userId: session.user.id,
        });
      } catch (mailErr) {
        console.error('[AddStudent] Welcome email failed:', mailErr.message);
      }
    }

    // Audit log
    try {
      await query(
        `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, new_values, created_at)
         VALUES ($1, $2, $3, 'student_profile', $4, NOW())`,
        [
          session.user.id,
          tenantId,
          isNew ? 'student_add_form' : 'student_update_form',
          JSON.stringify({ roll_number: normalizedRoll, email: normalizedEmail, systemId }),
        ]
      );
    } catch (auditErr) {
      console.error('[AddStudent] Audit log failed:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: isNew
        ? `Student added. Welcome email sent to ${normalizedEmail}.`
        : `Student profile updated for Roll No "${normalizedRoll}".`,
      studentId,
      systemId,
      isNew,
    });
  } catch (error) {
    console.error('[AddStudent] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_students' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
