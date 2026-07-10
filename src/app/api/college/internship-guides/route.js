import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import {
  INTERNSHIP_GUIDE_ELIGIBLE_STATUSES,
  isEligibleInternshipApplicationStatus,
  mapInternshipGuideRow,
  validateInternshipGuidePayload,
} from '@/lib/internshipGuide';
import { mapInternshipSupervisorRow } from '@/lib/internshipSupervisor';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const res = await query(
      `SELECT pa.id AS program_application_id,
              pa.status AS application_status,
              pa.applied_at,
              sp.roll_number,
              sp.branch,
              sp.department,
              sp.batch_year,
              t.short_code,
              u.first_name,
              u.last_name,
              jp.title AS opening_title,
              ep.company_name,
              ig.id AS guide_id,
              ig.guide_name,
              ig.guide_email,
              ig.guide_phone,
              ig.guide_department,
              ig.guide_notes,
              ig.updated_at AS guide_updated_at,
              isv.id AS supervisor_id,
              isv.supervisor_name,
              isv.supervisor_email,
              isv.supervisor_phone,
              isv.supervisor_team,
              isv.supervisor_notes,
              isv.updated_at AS supervisor_updated_at
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN internship_guides ig ON ig.program_application_id = pa.id
       LEFT JOIN internship_supervisors isv ON isv.program_application_id = pa.id
       WHERE pa.status = ANY($2::text[])
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY pa.applied_at DESC
       LIMIT 2000`,
      [tenantId, INTERNSHIP_GUIDE_ELIGIBLE_STATUSES],
    );

    const items = res.rows.map((row) => {
      const first = row.first_name || '';
      const last = row.last_name || '';
      const guide = mapInternshipGuideRow(
        row.guide_id
          ? {
              id: row.guide_id,
              program_application_id: row.program_application_id,
              guide_name: row.guide_name,
              guide_email: row.guide_email,
              guide_phone: row.guide_phone,
              guide_department: row.guide_department,
              guide_notes: row.guide_notes,
              updated_at: row.guide_updated_at,
            }
          : null,
      );
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
        applicationStatus: row.application_status,
        appliedAt: row.applied_at,
        studentName: `${first} ${last}`.trim() || 'Student',
        rollNumber: row.roll_number || '',
        systemId: formatStudentSystemId(row.short_code, row.roll_number),
        branch: row.branch || row.department || '—',
        batchYear: row.batch_year != null ? Number(row.batch_year) : null,
        companyName: row.company_name || '—',
        openingTitle: row.opening_title || '—',
        guide,
        supervisor,
        updatedAt: guide?.updatedAt || supervisor?.updatedAt || row.applied_at,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        withGuide: items.filter((i) => i.guide).length,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship guides are not available yet. Apply migration 091_internship_guides.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/college/internship-guides', error);
    return NextResponse.json({ error: 'Failed to load internship guides' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    const body = await req.json().catch(() => ({}));
    const programApplicationId = String(body.programApplicationId || '').trim();
    const clear = body.clear === true;

    if (!programApplicationId) {
      return NextResponse.json({ error: 'Internship application is required.' }, { status: 400 });
    }

    const appRes = await query(
      `SELECT pa.id, pa.status, pa.student_id, sp.tenant_id, pa.job_id
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $2::uuid
       WHERE pa.id = $1::uuid ${AND_PA_NOT_DELETED}`,
      [programApplicationId, tenantId],
    );
    const app = appRes.rows[0];
    if (!app) {
      return NextResponse.json({ error: 'Internship application not found for this campus.' }, { status: 404 });
    }
    if (!isEligibleInternshipApplicationStatus(app.status)) {
      return NextResponse.json(
        { error: 'Guides can be assigned only for selected or in-progress internships.' },
        { status: 400 },
      );
    }

    if (clear) {
      await query(`DELETE FROM internship_guides WHERE program_application_id = $1::uuid`, [programApplicationId]);
      return NextResponse.json({ success: true, guide: null });
    }

    const parsed = validateInternshipGuidePayload(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const upsert = await query(
      `INSERT INTO internship_guides (
         program_application_id, tenant_id, student_profile_id, job_id,
         guide_name, guide_email, guide_phone, guide_department, guide_notes,
         assigned_by, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10::uuid, NOW())
       ON CONFLICT (program_application_id)
       DO UPDATE SET guide_name = EXCLUDED.guide_name,
                     guide_email = EXCLUDED.guide_email,
                     guide_phone = EXCLUDED.guide_phone,
                     guide_department = EXCLUDED.guide_department,
                     guide_notes = EXCLUDED.guide_notes,
                     assigned_by = EXCLUDED.assigned_by,
                     updated_at = NOW()
       RETURNING id, program_application_id, guide_name, guide_email, guide_phone,
                 guide_department, guide_notes, updated_at`,
      [
        app.id,
        app.tenant_id,
        app.student_id,
        app.job_id,
        parsed.guideName,
        parsed.guideEmail,
        parsed.guidePhone,
        parsed.guideDepartment,
        parsed.guideNotes,
        userId,
      ],
    );

    return NextResponse.json({
      success: true,
      guide: mapInternshipGuideRow(upsert.rows[0]),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship guides are not available yet. Apply migration 091_internship_guides.sql.' },
        { status: 503 },
      );
    }
    console.error('POST /api/college/internship-guides', error);
    return NextResponse.json({ error: 'Failed to save guide' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET, POST: __platform_POST }, { context: 'api_college_internship_guides' });
export const GET = handlers.GET;
export const POST = handlers.POST;
