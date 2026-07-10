import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { studentApplicationsHrefForType } from '@/lib/studentSelectionOffer';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

function buildSelectionSubject(companyName, roleTitle) {
  const company = String(companyName || 'Company').trim();
  const role = String(roleTitle || 'Role').trim();
  return `[PlacementHub] Selected for ${role} at ${company}`;
}

/** @param {(text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>} runQuery */
async function selectionEmailRecentlySent(studentUserId, subject, runQuery = query) {
  if (!studentUserId || !subject) return false;
  try {
    const res = await runQuery(
      `SELECT 1 FROM mail_delivery_logs
       WHERE recipient_user_id = $1::uuid
         AND context = 'student_selection'
         AND status = 'sent'
         AND subject_truncated = $2
         AND created_at > NOW() - INTERVAL '7 days'
       LIMIT 1`,
      [studentUserId, subject.slice(0, 500)],
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error('selectionEmailRecentlySent check failed:', err);
    return false;
  }
}

/** @param {(text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>} runQuery */
async function selectionAlreadyNotified(applicationId, studentUserId, subject, runQuery = query) {
  if (!studentUserId) return false;

  if (applicationId) {
    const ref = `app:${applicationId}`;
    try {
      const res = await runQuery(
        `SELECT 1 FROM notifications
         WHERE user_id = $1::uuid
           AND title = 'Selection update'
           AND message LIKE $2
         LIMIT 1`,
        [studentUserId, `%${ref}%`],
      );
      if (res.rows.length > 0) return true;
    } catch (err) {
      console.error('selectionAlreadyNotified check failed:', err);
    }
  }

  return selectionEmailRecentlySent(studentUserId, subject, runQuery);
}

function buildSelectionNotificationContent({
  companyName,
  roleTitle,
  applicationId,
  sourceKind,
  programType,
}) {
  const applicationsPath =
    sourceKind === 'drive'
      ? studentApplicationsHrefForType('drives')
      : studentApplicationsHrefForType(programType || 'internships');
  const appRef = applicationId ? `app:${applicationId}` : '';
  const inAppMessage = appRef
    ? `You were selected by ${companyName} for ${roleTitle}. A formal offer letter will follow separately. (${appRef})`
    : `You were selected by ${companyName} for ${roleTitle}. A formal offer letter will follow separately.`;
  return { applicationsPath, appRef, inAppMessage, subject: buildSelectionSubject(companyName, roleTitle) };
}

/**
 * @param {{
 *   studentUserId: string;
 *   email: string;
 *   firstName: string;
 *   companyName: string;
 *   roleTitle: string;
 *   applicationId?: string;
 *   sourceKind?: 'drive' | 'program';
 *   programType?: string;
 * }} opts
 * @param {{ runQuery?: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }} [options]
 * @returns {Promise<boolean>} true when a new in-app notification row was inserted
 */
export async function recordStudentSelectionNotification(opts, { runQuery = query } = {}) {
  const {
    studentUserId,
    companyName,
    roleTitle,
    applicationId,
    sourceKind = 'drive',
    programType,
  } = opts;

  const { applicationsPath, inAppMessage, subject } = buildSelectionNotificationContent({
    companyName,
    roleTitle,
    applicationId,
    sourceKind,
    programType,
  });

  if (await selectionAlreadyNotified(applicationId, studentUserId, subject, runQuery)) {
    return false;
  }

  await runQuery(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [studentUserId, 'Selection update', inAppMessage, 'success', applicationsPath],
  );
  return true;
}

/**
 * @param {{
 *   studentUserId: string;
 *   email: string;
 *   firstName: string;
 *   companyName: string;
 *   roleTitle: string;
 *   applicationId?: string;
 *   sourceKind?: 'drive' | 'program';
 *   programType?: string;
 * }} opts
 */
export async function sendStudentSelectionEmail(opts) {
  const {
    studentUserId,
    email,
    firstName,
    companyName,
    roleTitle,
    applicationId,
    sourceKind = 'drive',
    programType,
  } = opts;

  const origin = appOrigin();
  const { applicationsPath, appRef, subject } = buildSelectionNotificationContent({
    companyName,
    roleTitle,
    applicationId,
    sourceKind,
    programType,
  });
  const applicationsLink = origin ? `${origin}${applicationsPath}` : applicationsPath;

  if (await selectionAlreadyNotified(applicationId, studentUserId, subject)) {
    return;
  }

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 20px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <h2 style="margin: 0; color: #ffffff;">Selection update</h2>
      </div>
      <div style="padding: 20px; line-height: 1.5;">
        <p>Hi ${firstName || 'there'},</p>
        <p>Congratulations — <strong>${companyName}</strong> has marked you <strong>selected</strong> for <strong>${roleTitle}</strong>.</p>
        <p style="margin: 12px 0; padding: 12px 14px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; color: #166534;">
          This is your <strong>selection</strong> outcome, not the formal offer. When the employer or placement office publishes the drafted offer letter, you will receive a separate email and can accept or decline on <strong>My Offers</strong>.
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${applicationsLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Applications</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
          PlacementHub — selection notification (formal offer will follow separately)${appRef ? ` · ${appRef}` : ''}.
        </p>
      </div>
    </div>
  `;

  await sendMail({
    to: email,
    subject,
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      `You were selected by ${companyName} for ${roleTitle}.`,
      'This is a selection update only. A formal offer letter will be sent separately when published.',
      `Track status: ${applicationsLink}`,
      appRef ? `Reference: ${appRef}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    html,
    context: 'student_selection',
    recipientUserId: studentUserId,
  });
}

/**
 * Notify student of selection (in-app alert + email).
 * This is NOT the formal offer — see studentFormalOfferNotify.js.
 *
 * @returns {Promise<{ sent: boolean; skipped?: boolean; reason?: string }>}
 */
export async function notifyStudentSelection(opts) {
  try {
    const recorded = await recordStudentSelectionNotification(opts);
    if (!recorded) {
      return { sent: false, skipped: true, reason: 'already_notified' };
    }
    await sendStudentSelectionEmail(opts);
    return { sent: true };
  } catch (err) {
    console.error('Failed to send student selection notification:', err);
    return { sent: false, reason: 'send_failed' };
  }
}
