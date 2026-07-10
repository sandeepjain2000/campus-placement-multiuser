import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { normalizeTimeHm, toDateOnlyString, validateInterviewDateTime } from '@/lib/dateOnly';
import {
  buildEmployerInterviewCalendarDescription,
  deleteEmployerInterviewCalendarSlot,
  insertEmployerInterviewCalendarSlot,
  updateEmployerInterviewCalendarSlot,
} from '@/lib/employerInterviewCalendarSync';
import { normalizeInterviewOpportunityKind } from '@/lib/employerInterviewOpportunity';
import { validateEmployerInterviewOpportunity } from '@/lib/employerInterviewOpportunityValidation';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getTenant(tenantId) {
  const res = await query(`SELECT id, name, settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
  return res.rows[0] || null;
}

async function savePlans(tenantId, settings) {
  await query(
    `UPDATE tenants SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
    [JSON.stringify(settings), tenantId],
  );
}

function filterRowsForUser(rows, userId) {
  return rows
    .filter((r) => r.employerUserId === userId)
    .map((r) => ({ ...r, date: toDateOnlyString(r.date) || r.date }));
}

async function requireEmployer(session) {
  const userId = session.user.id || session.user.sub;
  const employerRes = await query(
    `SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
    [userId],
  );
  const employerId = employerRes.rows[0]?.id;
  const companyName = employerRes.rows[0]?.company_name || 'Employer';
  if (!employerId) {
    return { error: NextResponse.json({ error: 'Employer profile not found' }, { status: 404 }) };
  }
  return { userId, employerId, companyName };
}

async function requireApprovedCampus(employerId, campusId) {
  const approvalRes = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [employerId, campusId],
  );
  if (!approvalRes.rows.length) {
    return {
      error: NextResponse.json(
        { error: 'This college partnership is not approved yet. Request campus access first.' },
        { status: 403 },
      ),
    };
  }
  return null;
}

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await requireEmployer(session);
    if (auth.error) return auth.error;

    const { id: planId } = await params;
    const body = await request.json();
    const campusId = String(body?.campusId || '').trim();
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const campusErr = await requireApprovedCampus(auth.employerId, campusId);
    if (campusErr) return campusErr.error;

    const round = String(body?.round || '').trim();
    const date = String(body?.date || '').trim();
    const time = String(body?.time || '').trim();
    const mode = String(body?.mode || 'Virtual').trim();
    const assigned = Number(body?.assigned || 0);
    const panelNames = String(body?.panelNames || '').trim();
    const campus = String(body?.campus || '').trim();
    const opportunityKind = normalizeInterviewOpportunityKind(body?.opportunityKind);
    const opportunityId = String(body?.opportunityId || '').trim();
    if (!round || !date || !time) {
      return NextResponse.json({ error: 'round, date and time are required' }, { status: 400 });
    }
    if (!opportunityKind || !opportunityId) {
      return NextResponse.json(
        { error: 'opportunityKind and opportunityId are required — select a specific opening.' },
        { status: 400 },
      );
    }

    const oppCheck = await validateEmployerInterviewOpportunity(auth.employerId, campusId, opportunityKind, opportunityId);
    if (!oppCheck.ok) {
      return NextResponse.json({ error: oppCheck.error }, { status: 400 });
    }

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });

    const settings = tenant.settings || {};
    const rows = Array.isArray(settings.employerInterviewPlans) ? settings.employerInterviewPlans : [];
    const idx = rows.findIndex((r) => r.id === planId && r.employerUserId === auth.userId);
    if (idx < 0) {
      return NextResponse.json({ error: 'Interview slot not found' }, { status: 404 });
    }

    const existingDate = toDateOnlyString(rows[idx].date) || rows[idx].date;
    const existingTime = normalizeTimeHm(rows[idx].time);
    const allowPast =
      toDateOnlyString(date) === existingDate && normalizeTimeHm(time) === existingTime;
    const dateTimeCheck = validateInterviewDateTime(date, time, { allowPast });
    if (!dateTimeCheck.ok) {
      return NextResponse.json({ error: dateTimeCheck.error }, { status: 400 });
    }

    const campusLabel = campus || tenant.name;
    rows[idx] = {
      ...rows[idx],
      campus: campusLabel,
      campusId,
      companyName: auth.companyName,
      opportunityKind,
      opportunityId,
      opportunityTitle: oppCheck.title,
      round,
      date: dateTimeCheck.value.date,
      time: dateTimeCheck.value.time,
      mode,
      assigned: Number.isFinite(assigned) ? assigned : 0,
      panelNames,
    };
    settings.employerInterviewPlans = rows;
    await savePlans(campusId, settings);

    const calDesc = buildEmployerInterviewCalendarDescription({
      employerUserId: auth.userId,
      time: dateTimeCheck.value.time,
      mode,
      panelNames,
      assigned: Number.isFinite(assigned) ? assigned : 0,
      planId,
      opportunityKind,
      opportunityTitle: oppCheck.title,
      opportunityId,
    });
    const calTitle = `${campusLabel} • ${round}`;
    try {
      const updated = await updateEmployerInterviewCalendarSlot({
        tenantId: campusId,
        planId,
        title: calTitle,
        dateYmd: dateTimeCheck.value.date,
        description: calDesc,
      });
      if (!updated) {
        await insertEmployerInterviewCalendarSlot({
          tenantId: campusId,
          title: calTitle,
          dateYmd: dateTimeCheck.value.date,
          description: calDesc,
        });
      }
    } catch (calErr) {
      console.warn('employer interview calendar update:', calErr?.message || calErr);
    }

    return NextResponse.json({ rows: filterRowsForUser(rows, auth.userId) });
  } catch (error) {
    console.error('PATCH /api/employer/interviews/[id]', error);
    return NextResponse.json({ error: 'Failed to update interview slot' }, { status: 500 });
  }
}

async function __platform_DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await requireEmployer(session);
    if (auth.error) return auth.error;

    const { id: planId } = await params;
    const { searchParams } = new URL(request.url);
    const campusId = String(searchParams.get('campusId') || '').trim();
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const campusErr = await requireApprovedCampus(auth.employerId, campusId);
    if (campusErr) return campusErr.error;

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });

    const settings = tenant.settings || {};
    const rows = Array.isArray(settings.employerInterviewPlans) ? settings.employerInterviewPlans : [];
    const next = rows.filter((r) => !(r.id === planId && r.employerUserId === auth.userId));
    if (next.length === rows.length) {
      return NextResponse.json({ error: 'Interview slot not found' }, { status: 404 });
    }

    settings.employerInterviewPlans = next;
    await savePlans(campusId, settings);

    try {
      await deleteEmployerInterviewCalendarSlot(campusId, planId);
    } catch (calErr) {
      console.warn('employer interview calendar delete:', calErr?.message || calErr);
    }

    return NextResponse.json({ rows: filterRowsForUser(next, auth.userId) });
  } catch (error) {
    console.error('DELETE /api/employer/interviews/[id]', error);
    return NextResponse.json({ error: 'Failed to delete interview slot' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_employer_interviews_id' });
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
