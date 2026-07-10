import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  isSemesterRolloverWindow,
  loadRecentRolloverRuns,
  loadRolloverStudentRoster,
  runSemesterRolloverForTenant,
  saveRolloverAdjustments,
} from '@/lib/studentSemesterRollover';

export const dynamic = 'force-dynamic';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

async function __platform_GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantId(session);
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const roster = await loadRolloverStudentRoster(tenantId);
  const preview = await runSemesterRolloverForTenant(tenantId, { dryRun: true });
  const recentRuns = await loadRecentRolloverRuns(tenantId);

  return NextResponse.json({
    inRolloverWindow: isSemesterRolloverWindow(),
    academicYearLabel: roster.academicYearLabel,
    semesterInYear: roster.semesterInYear,
    preview,
    roster: {
      students: roster.students,
      failedCount: roster.failedCount,
      pendingBatchChanges: roster.pendingBatchChanges,
      pendingSemesterChanges: roster.pendingSemesterChanges,
    },
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      academicYearLabel: r.academic_year_label,
      semesterInYear: r.semester_in_year,
      asOfDate: r.as_of_date,
      studentsScanned: r.students_scanned,
      studentsUpdated: r.students_updated,
      triggeredBy: r.triggered_by,
      dryRun: r.dry_run,
      createdAt: r.created_at,
    })),
  });
}

async function __platform_PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantId(session);
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const roster = await loadRolloverStudentRoster(tenantId);
  const result = await saveRolloverAdjustments(tenantId, {
    academicYearLabel: body.academicYearLabel || roster.academicYearLabel,
    semesterInYear: body.semesterInYear ?? roster.semesterInYear,
    adjustments: Array.isArray(body.adjustments) ? body.adjustments : [],
    userId: session.user.id,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await loadRolloverStudentRoster(tenantId);
  return NextResponse.json({ success: true, roster: updated });
}

async function __platform_POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantId(session);
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const dryRun = Boolean(body?.dryRun);
  const force = Boolean(body?.force);
  const asOfDate = body?.asOfDate ? new Date(body.asOfDate) : new Date();

  if (!dryRun && !force && !isSemesterRolloverWindow(asOfDate)) {
    return NextResponse.json(
      {
        error:
          'Semester rollover runs automatically in May–June. Pass force: true to run outside that window.',
      },
      { status: 400 },
    );
  }

  const result = await runSemesterRolloverForTenant(tenantId, {
    asOfDate,
    dryRun,
    force,
    triggeredBy: 'college_admin',
    triggeredByUserId: session.user.id,
  });

  return NextResponse.json({
    success: !result.skipped,
    ...result,
  });
}

export const { GET, PUT, POST } = withApiHandlers({
  GET: __platform_GET,
  PUT: __platform_PUT,
  POST: __platform_POST,
});
