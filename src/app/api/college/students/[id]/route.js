import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { COLLEGE_STUDENT_SELECT_SQL, mapCollegeStudentRow } from '@/lib/collegeStudentMapper';
import { archiveCollegeStudentProfile, ARCHIVE_COLUMN_HINT } from '@/lib/collegeStudentArchive';
import { parseCollegeStudentAdminPayload } from '@/lib/collegeStudentAdminFields';
import {


  applyCollegeStudentUserFields,
  replaceStudentSkills,
  updateCollegeStudentProfileRow,
} from '@/lib/collegeStudentProfileWrite';
import { resolveTenantAcademicYear } from '@/lib/resolveAcademicYearFromRequest';
import { displaySemesterForStudentList } from '@/lib/academicYearTenant';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff, assertCollegeWriter } from '@/lib/collegeAccess';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function loadStudentForTenant(tenantId, studentId, semesterDisplay) {
  const result = await query(
    `SELECT ${COLLEGE_STUDENT_SELECT_SQL}
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     JOIN tenants t ON t.id = sp.tenant_id
     WHERE sp.tenant_id = $1::uuid AND sp.id = $2::uuid AND ${SP_ACTIVE_CLAUSE}`,
    [tenantId, studentId],
  );
  if (!result.rows.length) return null;
  return mapCollegeStudentRow(result.rows[0], { semesterDisplay });
}

async function __platform_GET(request, { params }) {
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

    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student id is required' }, { status: 400 });
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

    const student = await loadStudentForTenant(tenantId, studentId, semesterDisplay);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    if (error?.code === '42703' && String(error?.message || '').includes('archived')) {
      return NextResponse.json({ error: ARCHIVE_COLUMN_HINT }, { status: 503 });
    }
    console.error('Failed to load student:', error);
    return NextResponse.json({ error: 'Failed to load student' }, { status: 500 });
  }
}

/** Update non-primary fields (department, CGPA, skills, etc.). Name, email, and roll are locked. */
async function __platform_PATCH(request, { params }) {
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

    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student id is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = parseCollegeStudentAdminPayload(body, { isEdit: true });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { profile, user: userFields, auxProfile, skills: skillsArr } = parsed;

    await transaction(async (client) => {
      const existing = await client.query(
        `SELECT sp.id, sp.user_id FROM student_profiles sp
         WHERE sp.id = $1::uuid AND sp.tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}`,
        [studentId, tenantId],
      );
      if (!existing.rows.length) {
        throw Object.assign(new Error('Student not found'), { status: 404 });
      }

      const userId = existing.rows[0].user_id;
      await applyCollegeStudentUserFields(client, userId, userFields);
      await updateCollegeStudentProfileRow(client, {
        profileId: studentId,
        tenantId,
        profile,
        auxProfile,
      });
      await replaceStudentSkills(client, studentId, skillsArr);
    });

    const { searchParams } = new URL(request.url);
    const ayContext = await resolveTenantAcademicYear(tenantId, searchParams);
    const displaySem = displaySemesterForStudentList({
      semesters: ayContext.semesters,
      selectedAcademicYear: ayContext.year,
      currentAcademicYear: ayContext.current,
    });
    const semesterDisplay =
      displaySem.sequenceNumber != null ? String(displaySem.sequenceNumber) : displaySem.label;

    const student = await loadStudentForTenant(tenantId, studentId, semesterDisplay);
    return NextResponse.json({ success: true, student });
  } catch (error) {
    if (error?.status === 404) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    if (error?.code === '42703' && String(error?.message || '').includes('archived')) {
      return NextResponse.json({ error: ARCHIVE_COLUMN_HINT }, { status: 503 });
    }
    console.error('PATCH /api/college/students/[id]', error);
    return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 500 });
  }
}

/** Soft-archive (removes from active list; deactivates login). */
async function __platform_DELETE(_request, { params }) {
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

    const { id: studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: 'Student id is required' }, { status: 400 });
    }

    const result = await archiveCollegeStudentProfile({
      profileId: studentId,
      tenantId,
      adminUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: 'Student archived and removed from the active list.' });
  } catch (error) {
    console.error('DELETE /api/college/students/[id]', error);
    return NextResponse.json({ error: 'Failed to archive student' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_students_id' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
