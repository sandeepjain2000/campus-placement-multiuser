import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const r = await query(
      `SELECT id, kind, title, summary, requirements, time_hint, status, created_at, updated_at
       FROM campus_engagement_listings
       WHERE tenant_id = $1::uuid
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return NextResponse.json({ listings: r.rows });
  } catch (e) {
    console.error('GET /api/college/engagement-listings', e);
    return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const kind = body.kind;
    const title = normalizeTitle(body.title);
    const summary = (body.summary || '').trim() || null;
    const requirements = (body.requirements || '').trim() || null;
    const timeHint = (body.timeHint || '').trim() || null;
    const status = body.status === 'published' ? 'published' : 'draft';

    if (!['guest_faculty', 'guest_lecture'].includes(kind)) {
      return NextResponse.json({ error: 'kind must be guest_faculty or guest_lecture' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(title, { label: 'Listing title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    const ins = await query(
      `INSERT INTO campus_engagement_listings
        (tenant_id, author_user_id, kind, title, summary, requirements, time_hint, status)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)
       RETURNING id, kind, title, summary, requirements, time_hint, status, created_at, updated_at`,
      [tenantId, session.user.id, kind, title, summary, requirements, timeHint, status]
    );

    return NextResponse.json({ listing: ins.rows[0] }, { status: 201 });
  } catch (e) {
    console.error('POST /api/college/engagement-listings', e);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_engagement_listings' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
