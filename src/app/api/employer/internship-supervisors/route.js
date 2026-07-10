import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import {
  INTERNSHIP_SUPERVISOR_ELIGIBLE_STATUSES,
  isEligibleInternshipApplicationStatus,
  mapInternshipSupervisorRow,
  validateInternshipSupervisorPayload,
} from '@/lib/internshipSupervisor';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const res = await query(
      `SELECT pa.id AS program_application_id,
              pa.status,
              pa.applied_at,
              sp.roll_number,
              t.short_code,
              u.first_name,
              u.last_name,
              jp.id AS job_id,
              jp.title AS opening_title,
              isv.id AS supervisor_id,
              isv.supervisor_name,
              isv.supervisor_email,
              isv.supervisor_phone,
              isv.supervisor_team,
              isv.supervisor_notes,
              isv.updated_at AS supervisor_updated_at
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $1::uuid
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN internship_supervisors isv ON isv.program_application_id = pa.id
       WHERE pa.status = ANY($2::text[])
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY jp.title, u.first_name
       LIMIT 2000`,
      [employerId, INTERNSHIP_SUPERVISOR_ELIGIBLE_STATUSES],
    );

    const items = res.rows.map((row) => {
      const first = row.first_name || '';
      const last = row.last_name || '';
      const supervisor = mapInternshipSupervisorRow(
        row.supervisor_id
          ? {
              id: row.supervisor_id,
              program_application_id: row.program_application_id,
              supervisor_name: row.supervisor_name,
              supervisor_email: row.supervisor_email,
              supervisor_phone: row.supervisor_phone,
              supervisor_team: row.supervisor_team,
              supervisor_notes: row.supervisor_notes,
              updated_at: row.supervisor_updated_at,
            }
          : null,
      );
      return {
        programApplicationId: String(row.program_application_id),
        status: row.status,
        appliedAt: row.applied_at,
        studentName: `${first} ${last}`.trim() || 'Student',
        rollNumber: row.roll_number || '',
        systemId: formatStudentSystemId(row.short_code, row.roll_number),
        jobId: String(row.job_id),
        openingTitle: row.opening_title || 'Internship',
        supervisor,
        updatedAt: supervisor?.updatedAt || row.applied_at,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        withSupervisor: items.filter((i) => i.supervisor).length,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship supervisors are not available yet. Apply migration 092_internship_supervisors.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/employer/internship-supervisors', error);
    return NextResponse.json({ error: 'Failed to load internship supervisors' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const programApplicationId = String(body.programApplicationId || '').trim();
    const clear = body.clear === true;

    if (!programApplicationId) {
      return NextResponse.json({ error: 'Internship application is required.' }, { status: 400 });
    }

    const appRes = await query(
      `SELECT pa.id, pa.status, pa.student_id, sp.tenant_id, pa.job_id
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $2::uuid
       WHERE pa.id = $1::uuid ${AND_PA_NOT_DELETED}`,
      [programApplicationId, employerId],
    );
    const app = appRes.rows[0];
    if (!app) {
      return NextResponse.json({ error: 'Internship application not found.' }, { status: 404 });
    }
    if (!isEligibleInternshipApplicationStatus(app.status)) {
      return NextResponse.json(
        { error: 'Supervisors can be assigned only for selected or in-progress interns.' },
        { status: 400 },
      );
    }

    if (clear) {
      await query(
        `DELETE FROM internship_supervisors
         WHERE program_application_id = $1::uuid AND employer_id = $2::uuid`,
        [programApplicationId, employerId],
      );
      return NextResponse.json({ success: true, supervisor: null });
    }

    const parsed = validateInternshipSupervisorPayload(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const upsert = await query(
      `INSERT INTO internship_supervisors (
         program_application_id, tenant_id, student_profile_id, job_id, employer_id,
         supervisor_name, supervisor_email, supervisor_phone, supervisor_team, supervisor_notes,
         assigned_by, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11::uuid, NOW())
       ON CONFLICT (program_application_id)
       DO UPDATE SET supervisor_name = EXCLUDED.supervisor_name,
                     supervisor_email = EXCLUDED.supervisor_email,
                     supervisor_phone = EXCLUDED.supervisor_phone,
                     supervisor_team = EXCLUDED.supervisor_team,
                     supervisor_notes = EXCLUDED.supervisor_notes,
                     assigned_by = EXCLUDED.assigned_by,
                     employer_id = EXCLUDED.employer_id,
                     updated_at = NOW()
       RETURNING id, program_application_id, supervisor_name, supervisor_email, supervisor_phone,
                 supervisor_team, supervisor_notes, updated_at`,
      [
        app.id,
        app.tenant_id,
        app.student_id,
        app.job_id,
        employerId,
        parsed.supervisorName,
        parsed.supervisorEmail,
        parsed.supervisorPhone,
        parsed.supervisorTeam,
        parsed.supervisorNotes,
        userId,
      ],
    );

    return NextResponse.json({
      success: true,
      supervisor: mapInternshipSupervisorRow(upsert.rows[0]),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship supervisors are not available yet. Apply migration 092_internship_supervisors.sql.' },
        { status: 503 },
      );
    }
    console.error('POST /api/employer/internship-supervisors', error);
    return NextResponse.json({ error: 'Failed to save supervisor' }, { status: 500 });
  }
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_employer_internship_supervisors' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
