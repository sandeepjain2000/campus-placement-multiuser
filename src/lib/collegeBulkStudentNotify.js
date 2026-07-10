import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { notifyUsersOneAtATime } from '@/lib/notificationService';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import {
  buildDriveReminderDefaults,
  normalizeBatchYear,
  normalizeBranchSelection,
} from '@/lib/collegeBulkStudentNotifyShared';

export { buildDriveReminderDefaults, normalizeBatchYear, normalizeBranchSelection };

const MAX_MESSAGE_LEN = 4000;
const MAX_TITLE_LEN = 250;

function clip(s, max) {
  const t = String(s ?? '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {{
 *   tenantId: string;
 *   batchYear: number;
 *   allBranches?: boolean;
 *   branches?: string[];
 * }} opts
 */
export async function resolveBulkNotifyRecipients({ tenantId, batchYear, allBranches = false, branches = [] }) {
  const year = normalizeBatchYear(batchYear);
  if (!tenantId || year == null) return [];

  const branchNorm = normalizeBranchSelection(branches, allBranches);
  const params = [tenantId, year];
  let branchSql = '';

  if (!branchNorm.allBranches) {
    if (!branchNorm.branches.length) return [];
    params.push(branchNorm.branches);
    branchSql = ` AND COALESCE(NULLIF(TRIM(sp.branch), ''), NULLIF(TRIM(sp.department), '')) = ANY($3::text[])`;
  }

  const res = await query(
    `SELECT u.id AS user_id,
            COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
            u.first_name,
            sp.roll_number,
            COALESCE(NULLIF(TRIM(sp.branch), ''), sp.department) AS branch_label
     FROM student_profiles sp
     INNER JOIN users u ON u.id = sp.user_id
     WHERE sp.tenant_id = $1::uuid
       AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
       AND u.role = 'student'
       AND u.is_active = true
       AND (sp.batch_year = $2 OR sp.graduation_year = $2)
       AND COALESCE(sp.is_alumni, false) = false
       ${branchSql}
     ORDER BY u.first_name, u.last_name`,
    params,
  );

  return res.rows.map((row) => ({
    userId: String(row.user_id),
    email: String(row.email || '').trim(),
    firstName: row.first_name,
    rollNumber: row.roll_number,
    branch: row.branch_label,
  }));
}

/**
 * @param {string} tenantId
 */
export async function loadBulkNotifyAudienceMeta(tenantId) {
  const [branchesRes, yearsRes, drivesRes] = await Promise.all([
    query(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(sp.branch), ''), NULLIF(TRIM(sp.department), '')) AS branch
       FROM student_profiles sp
       WHERE sp.tenant_id = $1::uuid
         AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
         AND COALESCE(sp.is_alumni, false) = false
         AND COALESCE(NULLIF(TRIM(sp.branch), ''), NULLIF(TRIM(sp.department), '')) IS NOT NULL
       ORDER BY branch`,
      [tenantId],
    ),
    query(
      `SELECT DISTINCT y AS batch_year
       FROM (
         SELECT batch_year AS y FROM student_profiles
         WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} AND batch_year IS NOT NULL
         UNION
         SELECT graduation_year AS y FROM student_profiles
         WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} AND graduation_year IS NOT NULL
       ) t
       WHERE y IS NOT NULL
       ORDER BY y DESC`,
      [tenantId],
    ),
    query(
      `SELECT d.id,
              d.title,
              d.drive_date,
              d.status,
              ep.company_name AS company
       FROM placement_drives d
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE d.tenant_id = $1::uuid
         AND d.status IN ('approved', 'scheduled')
         AND (d.drive_date IS NULL OR d.drive_date >= CURRENT_DATE)
         ${AND_DRIVE_NOT_DELETED}
       ORDER BY d.drive_date ASC NULLS LAST, d.created_at DESC
       LIMIT 50`,
      [tenantId],
    ),
  ]);

  return {
    branches: branchesRes.rows.map((r) => String(r.branch)).filter(Boolean),
    batchYears: yearsRes.rows.map((r) => Number(r.batch_year)).filter((n) => Number.isFinite(n)),
    upcomingDrives: drivesRes.rows.map((row) => ({
      id: String(row.id),
      title: row.title || 'Placement drive',
      company: row.company || 'Company',
      driveDate: row.drive_date,
      status: row.status,
    })),
  };
}

/**
 * @param {{
 *   recipients: Array<{ userId: string; email: string; firstName?: string | null }>;
 *   title: string;
 *   message: string;
 *   link?: string | null;
 *   sendAlert?: boolean;
 *   sendEmail?: boolean;
 *   emailSubject?: string;
 *   triggeredByUserId?: string | null;
 * }} opts
 */
export async function sendCollegeBulkStudentCommunications({
  recipients,
  title,
  message,
  link = '/dashboard/student/drives',
  sendAlert = true,
  sendEmail = false,
  emailSubject,
  triggeredByUserId = null,
}) {
  const list = Array.isArray(recipients) ? recipients.filter((r) => r?.userId) : [];
  const alertTitle = clip(title, MAX_TITLE_LEN);
  const alertMessage = clip(message, MAX_MESSAGE_LEN);
  const subject = clip(emailSubject || title, MAX_TITLE_LEN);
  const safeLink = link ? String(link).trim() : null;

  let alertsSent = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  if (sendAlert && list.length) {
    await notifyUsersOneAtATime(
      list.map((r) => r.userId),
      { title: alertTitle, message: alertMessage, type: 'info', link: safeLink },
    );
    alertsSent = list.length;
  }

  if (sendEmail) {
    for (const r of list) {
      if (!r.email) {
        emailsFailed += 1;
        continue;
      }
      const fn = String(r.firstName || '').trim() || 'there';
      const html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 16px 20px;">
            <h2 style="margin: 0; color: #fff; font-size: 18px;">${escapeHtml(alertTitle)}</h2>
          </div>
          <div style="padding: 20px; line-height: 1.55; white-space: pre-wrap;">${escapeHtml(alertMessage)}</div>
        </div>`;
      try {
        await sendMail({
          to: r.email,
          subject,
          text: `Hi ${fn},\n\n${alertMessage}\n`,
          html,
          context: 'college_bulk_student_notify',
          userId: triggeredByUserId || undefined,
          recipientUserId: r.userId,
        });
        emailsSent += 1;
      } catch (err) {
        console.error('Bulk student email failed:', r.userId, err);
        emailsFailed += 1;
      }
    }
  }

  return { recipientCount: list.length, alertsSent, emailsSent, emailsFailed };
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
