import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { loadBulkNotifyAudienceMeta } from '@/lib/collegeBulkStudentNotify';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
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

    const meta = await loadBulkNotifyAudienceMeta(tenantId);
    return NextResponse.json(meta);
  } catch (error) {
    console.error('GET /api/college/bulk-notifications/meta', error);
    return NextResponse.json({ error: 'Failed to load audience options' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_college_bulk_notifications_meta' });
export const GET = handlers.GET;
