import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  normalizeBatchYear,
  normalizeBranchSelection,
  resolveBulkNotifyRecipients,
} from '@/lib/collegeBulkStudentNotify';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const batchYear = normalizeBatchYear(body.batchYear);
    if (batchYear == null) {
      return NextResponse.json({ error: 'Batch year is required.' }, { status: 400 });
    }

    const branchSel = normalizeBranchSelection(body.branches, Boolean(body.allBranches));
    if (!branchSel.allBranches && !branchSel.branches.length) {
      return NextResponse.json({ error: 'Select at least one branch or choose all branches.' }, { status: 400 });
    }

    const recipients = await resolveBulkNotifyRecipients({
      tenantId,
      batchYear,
      allBranches: branchSel.allBranches,
      branches: branchSel.branches,
    });

    return NextResponse.json({
      recipientCount: recipients.length,
      sampleRolls: recipients.slice(0, 5).map((r) => r.rollNumber).filter(Boolean),
    });
  } catch (error) {
    console.error('POST /api/college/bulk-notifications/preview', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_college_bulk_notifications_preview' });
export const POST = handlers.POST;
