import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

async function getTenant(tenantId) {
  const res = await query(`SELECT id, name, settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
  return res.rows[0] || null;
}

async function savePlans(tenantId, settings) {
  await query(
    `UPDATE tenants
     SET settings = $1::jsonb, updated_at = NOW()
     WHERE id = $2::uuid`,
    [JSON.stringify(settings), tenantId]
  );
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ rows: [] });

    const list = Array.isArray(tenant.settings?.employerInterviewPlans) ? tenant.settings.employerInterviewPlans : [];
    const rows = list.filter((r) => r.employerUserId === session.user.id);
    return NextResponse.json({ rows, campusName: tenant.name });
  } catch (error) {
    console.error('GET /api/employer/interviews', error);
    return NextResponse.json({ error: 'Failed to load interview plans' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const campusId = String(body?.campusId || '').trim();
    if (!campusId) return NextResponse.json({ error: 'campusId is required' }, { status: 400 });

    const round = String(body?.round || '').trim();
    const date = String(body?.date || '').trim();
    const time = String(body?.time || '').trim();
    const mode = String(body?.mode || 'Virtual').trim();
    const assigned = Number(body?.assigned || 0);
    const panelNames = String(body?.panelNames || '').trim();
    const campus = String(body?.campus || '').trim();
    if (!round || !date || !time) {
      return NextResponse.json({ error: 'round, date and time are required' }, { status: 400 });
    }

    const tenant = await getTenant(campusId);
    if (!tenant) return NextResponse.json({ error: 'Campus not found' }, { status: 404 });

    const settings = tenant.settings || {};
    const rows = Array.isArray(settings.employerInterviewPlans) ? settings.employerInterviewPlans : [];
    rows.unshift({
      id: `ei-${Date.now()}`,
      employerUserId: session.user.id,
      campus: campus || tenant.name,
      round,
      date,
      time,
      mode,
      assigned: Number.isFinite(assigned) ? assigned : 0,
      panelNames,
    });
    settings.employerInterviewPlans = rows;
    await savePlans(campusId, settings);
    return NextResponse.json({ rows: rows.filter((r) => r.employerUserId === session.user.id) });
  } catch (error) {
    console.error('POST /api/employer/interviews', error);
    return NextResponse.json({ error: 'Failed to save interview plan' }, { status: 500 });
  }
}
