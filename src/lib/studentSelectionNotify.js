import { query } from '@/lib/db';
import { mirrorInAppAlertToYopmail } from '@/lib/notificationService';
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
  await mirrorInAppAlertToYopmail({
    title: 'Selection update',
    message: inAppMessage,
    type: 'success',
    link: applicationsPath,
    audience: '1 student',
    userId: studentUserId,
  });
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

  const { sendApplicationSelected } = await import('@/lib/email/sendApplicationStatus');
  await sendApplicationSelected({
    to: email,
    subject,
    firstName,
    companyName,
    roleTitle,
    applicationsUrl: applicationsLink,
    appRef,
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
