import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const parts = [];
    const vals = [];
    let n = 1;

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (t.length < 3) {
        return NextResponse.json({ error: 'Title too short' }, { status: 400 });
      }
      parts.push(`title = $${n++}`);
      vals.push(t);
    }
    if (body.summary !== undefined) {
      parts.push(`summary = $${n++}`);
      vals.push(String(body.summary).trim() || null);
    }
    if (body.requirements !== undefined) {
      parts.push(`requirements = $${n++}`);
      vals.push(String(body.requirements).trim() || null);
    }
    if (body.timeHint !== undefined) {
      parts.push(`time_hint = $${n++}`);
      vals.push(String(body.timeHint).trim() || null);
    }
    if (body.status !== undefined) {
      const s = body.status;
      if (!['draft', 'published', 'closed'].includes(s)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      parts.push(`status = $${n++}`);
      vals.push(s);
    }

    if (!parts.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    parts.push('updated_at = NOW()');
    vals.push(id, tenantId);

    const sql = `
      UPDATE campus_engagement_listings
      SET ${parts.join(', ')}
      WHERE id = $${n++}::uuid AND tenant_id = $${n++}::uuid
      RETURNING id, kind, title, summary, requirements, time_hint, status, created_at, updated_at`;

    const r = await query(sql, vals);
    if (!r.rows.length) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ listing: r.rows[0] });
  } catch (e) {
    console.error('PATCH /api/college/engagement-listings/[id]', e);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}
