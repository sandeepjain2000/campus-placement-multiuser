import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSessionTenantId } from '@/lib/tenantContext';
import {
  buildAssessmentSummary,
  fetchAssessmentRowsForView,
  fetchLatestRoundLabelsForTenant,
} from '@/lib/assessmentHiringView';

/** GET — read-only: all assessment upload rows for this college tenant. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const rows = await fetchAssessmentRowsForView({ tenantId });
    const roundLabels = await fetchLatestRoundLabelsForTenant(tenantId);
    const summary = buildAssessmentSummary(rows);

    return NextResponse.json({
      rows,
      roundLabels,
      summary,
    });
  } catch (e) {
    console.error('GET /api/college/hiring-assessment-view', e);
    return NextResponse.json({ error: 'Failed to load assessment view' }, { status: 500 });
  }
}
