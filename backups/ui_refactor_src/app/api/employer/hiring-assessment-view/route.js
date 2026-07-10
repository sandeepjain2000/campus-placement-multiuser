import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import {
  buildAssessmentSummary,
  fetchAssessmentRowsForView,
  fetchLatestRoundLabels,
} from '@/lib/assessmentHiringView';

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function employerHasApprovedTenant(userId, tenantId) {
  const emp = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  const eid = emp.rows[0]?.id;
  if (!eid) return false;
  const r = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [eid, tenantId],
  );
  return r.rows.length > 0;
}

/** GET — read-only hiring assessment view from assessment CSV uploads only. */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const tenantParam = url.searchParams.get('tenantId');
    const tenantId =
      tenantParam && isUuid(tenantParam) && (await employerHasApprovedTenant(session.user.id, tenantParam))
        ? tenantParam
        : null;

    const rows = await fetchAssessmentRowsForView({
      employerId,
      tenantId: tenantId || undefined,
    });
    const roundLabels = await fetchLatestRoundLabels(employerId, tenantId || undefined);
    const summary = buildAssessmentSummary(rows);

    return NextResponse.json({
      rows,
      roundLabels,
      summary,
      tenantFilter: tenantId,
    });
  } catch (e) {
    console.error('GET /api/employer/hiring-assessment-view', e);
    return NextResponse.json({ error: 'Failed to load assessment view' }, { status: 500 });
  }
}
