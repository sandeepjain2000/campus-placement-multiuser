import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

/** PATCH { placementSeasonLabel } — merges into tenants.settings (college_admin only). */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const placementSeasonLabel = String(body?.placementSeasonLabel ?? '').trim();

    const existing = await query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId]);
    if (!existing.rows.length) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const prev = existing.rows[0].settings || {};
    const merged = { ...prev, placementSeasonLabel };

    await query(`UPDATE tenants SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, [
      JSON.stringify(merged),
      tenantId,
    ]);

    return NextResponse.json({ success: true, placementSeasonLabel });
  } catch (e) {
    console.error('PATCH /api/college/settings/placement-season', e);
    return NextResponse.json({ error: 'Failed to save placement season' }, { status: 500 });
  }
}
