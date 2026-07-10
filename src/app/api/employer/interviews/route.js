import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { toDateOnlyString, validateInterviewDateTime } from '@/lib/dateOnly';
import {
  buildEmployerInterviewCalendarDescription,
  insertEmployerInterviewCalendarSlot,
} from '@/lib/employerInterviewCalendarSync';
import {
  interviewSlotMatchesKind,
  normalizeInterviewOpportunityKind,
} from '@/lib/employerInterviewOpportunity';
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
    `UPDATE tenants
     SET settings = $1::jsonb, updated_at = NOW()
     WHERE id = $2::uuid`,
    [JSON.stringify(settings), tenantId],
  );
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    const kind = normalizeInterviewOpportunityKind(searchParams.get('kind'));
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ rows: [] });

    const list = Array.isArray(tenant.settings?.employerInterviewPlans) ? tenant.settings.employerInterviewPlans : [];
    const userId = session.user.id || session.user.sub;
    const rows = list
      .filter((r) => r.employerUserId === userId)
      .filter((r) => interviewSlotMatchesKind(r, kind))
      .map((r) => ({ ...r, date: toDateOnlyString(r.date) || r.date }));
    return NextResponse.json({ rows, campusName: tenant.name });
  } catch (error) {
    console.error('GET /api/employer/interviews', error);
    return NextResponse.json({ error: 'Failed to load interview plans' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id || session.user.sub;
    const employerRes = await query(
      `SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
      [userId],
    );
    const employerId = employerRes.rows[0]?.id;
    const companyName = employerRes.rows[0]?.company_name || 'Employer';
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const campusId = String(body?.campusId || '').trim();
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const approvalRes = await query(
      `SELECT 1 FROM employer_approvals
       WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
       LIMIT 1`,
      [employerId, campusId],
    );
    if (!approvalRes.rows.length) {
      return NextResponse.json(
        { error: 'This college partnership is not approved yet. Request campus access first.' },
        { status: 403 },
      );
    }

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

    const oppCheck = await validateEmployerInterviewOpportunity(employerId, campusId, opportunityKind, opportunityId);
    if (!oppCheck.ok) {
      return NextResponse.json({ error: oppCheck.error }, { status: 400 });
    }

    const dateTimeCheck = validateInterviewDateTime(date, time, { allowPast: false });
    if (!dateTimeCheck.ok) {
      return NextResponse.json({ error: dateTimeCheck.error }, { status: 400 });
    }

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });

    const planId = `ei-${Date.now()}`;
    const settings = tenant.settings || {};
    const rows = Array.isArray(settings.employerInterviewPlans) ? settings.employerInterviewPlans : [];
    rows.unshift({
      id: planId,
      employerUserId: userId,
      campus: campus || tenant.name,
      campusId,
      companyName,
      opportunityKind,
      opportunityId,
      opportunityTitle: oppCheck.title,
      round,
      date: dateTimeCheck.value.date,
      time: dateTimeCheck.value.time,
      mode,
      assigned: Number.isFinite(assigned) ? assigned : 0,
      panelNames,
    });
    settings.employerInterviewPlans = rows;
    await savePlans(campusId, settings);

    try {
      await insertEmployerInterviewCalendarSlot({
        tenantId: campusId,
        title: `${campus || tenant.name} • ${round}`,
        dateYmd: dateTimeCheck.value.date,
        description: buildEmployerInterviewCalendarDescription({
          employerUserId: userId,
          time: dateTimeCheck.value.time,
          mode,
          panelNames,
          assigned: Number.isFinite(assigned) ? assigned : 0,
          planId,
          opportunityKind,
          opportunityTitle: oppCheck.title,
          opportunityId,
        }),
      });
    } catch (calErr) {
      console.warn('employer interview college_calendar sync:', calErr?.message || calErr);
    }

    return NextResponse.json({
      rows: rows.filter((r) => r.employerUserId === userId).map((r) => ({
        ...r,
        date: toDateOnlyString(r.date) || r.date,
      })),
    });
  } catch (error) {
    console.error('POST /api/employer/interviews', error);
    return NextResponse.json({ error: 'Failed to save interview plan' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_employer_interviews' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
