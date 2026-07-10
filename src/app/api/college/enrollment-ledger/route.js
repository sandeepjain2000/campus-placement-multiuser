import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

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
      `SELECT surface_token FROM shard_binding_pairs WHERE ref_scope_id = $1::uuid`,
      [tenantId]
    );

    if (!r.rows.length) {
      return NextResponse.json(
        { error: 'No enrollment key is configured for this campus. Contact platform support.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      enrollmentKey: r.rows[0].surface_token,
    });
  } catch (e) {
    console.error('GET /api/college/enrollment-ledger', e);
    return NextResponse.json({ error: 'Failed to load enrollment key' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_enrollment_ledger' });
export const GET = __platformApiHandlers.GET;
