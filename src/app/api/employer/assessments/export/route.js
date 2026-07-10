import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { buildAssessmentExportCsv } from '@/lib/assessmentUploadExport';
import { assessmentExportFilename } from '@/lib/assessmentUploadStarterCsv';
import { isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function employerHasApprovedTenant(employerId, tenantId) {
  const r = await query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [employerId, tenantId],
  );
  return r.rows.length > 0;
}

/** GET — campus student CSV for import/export. Query: kind, tenantId, driveId?, jobId?, academicYearId? */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') || 'jobs';
    const tenantId = url.searchParams.get('tenantId')?.trim() || '';
    const driveId = url.searchParams.get('driveId')?.trim() || '';
    const jobId = url.searchParams.get('jobId')?.trim() || '';
    const academicYearLabel = url.searchParams.get('academicYearLabel')?.trim() || null;

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'kind must be internship, jobs, drive, or projects' }, { status: 400 });
    }
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json({ error: 'tenantId (campus) is required' }, { status: 400 });
    }
    if (!(await employerHasApprovedTenant(employerId, tenantId))) {
      return NextResponse.json({ error: 'Employer is not approved for this campus' }, { status: 403 });
    }
    if (kind === 'drive' && (!driveId || !isUuid(driveId))) {
      return NextResponse.json({ error: 'driveId is required for drive CSV export' }, { status: 400 });
    }
    if (kind !== 'drive' && (!jobId || !isUuid(jobId))) {
      return NextResponse.json({ error: 'jobId is required for this opportunity type' }, { status: 400 });
    }

    const { csv, rowCount, academicYearLabel: resolvedYear, eligibilityExcludedCount } =
      await buildAssessmentExportCsv(employerId, kind, {
        tenantId,
        driveId: driveId || null,
        jobId: jobId || null,
        academicYearLabel,
      });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${assessmentExportFilename(kind)}"`,
        'X-Row-Count': String(rowCount),
        'X-Academic-Year': resolvedYear || '',
        'X-Eligibility-Excluded': String(eligibilityExcludedCount ?? 0),
      },
    });
  } catch (e) {
    console.error('GET /api/employer/assessments/export', e);
    return NextResponse.json({ error: e.message || 'Failed to export assessment CSV' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_export' });
export const GET = __platformApiHandlers.GET;
