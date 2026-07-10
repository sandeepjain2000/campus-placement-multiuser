import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { purgeAllJobsAndInternships } from '@/lib/demoPurgeFactory';
import { getRequestClientIp } from '@/lib/auditLog';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const session = await getServerSession(authOptions);
    const sessionTenant = session?.user ? getSessionTenantId(session.user) : null;
    const tenantId = sessionTenant && isUuid(sessionTenant) ? sessionTenant : null;

    const result = await purgeAllJobsAndInternships({
      userId: session?.user?.id || null,
      tenantId,
      ipAddress: getRequestClientIp(request),
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error('POST /api/demo/purge-all-jobs-internships', e);
    return NextResponse.json(
      { ok: false, error: e.message || 'Failed to delete jobs and internships' },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_purge_all_jobs_internships' });
export const POST = __platformApiHandlers.POST;
