import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  buildDriveReminderDefaults,
  normalizeBatchYear,
  normalizeBranchSelection,
  resolveBulkNotifyRecipients,
  sendCollegeBulkStudentCommunications,
} from '@/lib/collegeBulkStudentNotify';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
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

    const sendAlert = body.sendAlert !== false && body.channels?.alert !== false;
    const sendEmail = Boolean(body.sendEmail || body.channels?.email);
    if (!sendAlert && !sendEmail) {
      return NextResponse.json({ error: 'Choose at least one channel: in-app alert and/or email.' }, { status: 400 });
    }

    let title = String(body.title || '').trim();
    let message = String(body.message || '').trim();
    let link = String(body.link || '/dashboard/student/drives').trim() || '/dashboard/student/drives';
    let emailSubject = String(body.emailSubject || '').trim();

    const driveId = String(body.driveId || '').trim();
    if (driveId) {
      const driveRes = await query(
        `SELECT d.title, d.drive_date, ep.company_name AS company
         FROM placement_drives d
         LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE d.id = $1::uuid AND d.tenant_id = $2::uuid ${AND_DRIVE_NOT_DELETED}
         LIMIT 1`,
        [driveId, tenantId],
      );
      const driveRow = driveRes.rows[0];
      if (!driveRow) {
        return NextResponse.json({ error: 'Drive not found on your campus.' }, { status: 404 });
      }
      const defaults = buildDriveReminderDefaults({
        company: driveRow.company,
        title: driveRow.title,
        driveDate: driveRow.drive_date,
      });
      if (!title) title = defaults.alertTitle;
      if (!message) message = defaults.alertMessage;
      if (!emailSubject) emailSubject = defaults.emailSubject;
      link = defaults.link;
    }

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required (or pick a drive to use the default reminder).' }, { status: 400 });
    }

    const recipients = await resolveBulkNotifyRecipients({
      tenantId,
      batchYear,
      allBranches: branchSel.allBranches,
      branches: branchSel.branches,
    });

    if (!recipients.length) {
      return NextResponse.json(
        { error: 'No active students match this batch year and branch selection.' },
        { status: 400 },
      );
    }

    const userId = session.user.id || session.user.sub;
    const result = await sendCollegeBulkStudentCommunications({
      recipients,
      title,
      message,
      link,
      sendAlert,
      sendEmail,
      emailSubject: emailSubject || title,
      triggeredByUserId: userId,
    });

    return NextResponse.json({
      success: true,
      message: `Sent to ${result.recipientCount} student(s). Alerts: ${result.alertsSent}. Emails: ${result.emailsSent}${
        result.emailsFailed ? ` (${result.emailsFailed} failed)` : ''
      }.`,
      ...result,
    });
  } catch (error) {
    console.error('POST /api/college/bulk-notifications/send', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_college_bulk_notifications_send' });
export const POST = handlers.POST;
