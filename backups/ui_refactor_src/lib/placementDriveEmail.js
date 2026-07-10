import { sendMail } from '@/lib/mailer';
import { getPlatformSettings } from '@/lib/platformSettings';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

/**
 * Employer requested a new placement drive (status requested).
 */
export async function emailPlacementDriveRequested({
  companyName,
  driveTitle,
  collegeName,
  driveDateLabel,
  driveType,
  driveId,
}) {
  const platform = await getPlatformSettings();
  const to = String(platform.systemNotificationInboxEmail || platform.supportEmail || '').trim();
  if (!to) return;

  const origin = appOrigin();
  const path = '/dashboard/college/drives';
  const abs = origin ? `${origin}${path}` : path;
  const webmail = String(platform.systemNotificationWebmailUrl || '').trim();

  const lines = [
    'A new placement drive request was submitted.',
    '',
    `Company: ${companyName}`,
    `College: ${collegeName}`,
    `Drive: ${driveTitle}`,
    `Date: ${driveDateLabel}`,
    `Type: ${String(driveType || '').replace(/_/g, ' ')}`,
    `Drive ID: ${driveId}`,
    '',
    `College admins: review and approve in the dashboard: ${abs}`,
  ];
  if (webmail) {
    lines.push('', `Read system mail in your configured webmail: ${webmail}`);
  }

  await sendMail({
    to,
    subject: `[PlacementHub] Drive requested — ${driveTitle}`,
    text: lines.join('\n'),
  });
}

/**
 * College approved a placement drive.
 */
export async function emailPlacementDriveApproved({
  companyName,
  driveTitle,
  collegeName,
  driveDateLabel,
  driveType,
  driveId,
}) {
  const platform = await getPlatformSettings();
  const to = String(platform.systemNotificationInboxEmail || platform.supportEmail || '').trim();
  if (!to) return;

  const origin = appOrigin();
  const path = '/dashboard/employer/drives';
  const abs = origin ? `${origin}${path}` : path;
  const webmail = String(platform.systemNotificationWebmailUrl || '').trim();

  const lines = [
    'A placement drive was approved.',
    '',
    `Company: ${companyName}`,
    `College: ${collegeName}`,
    `Drive: ${driveTitle}`,
    `Date: ${driveDateLabel}`,
    `Type: ${String(driveType || '').replace(/_/g, ' ')}`,
    `Drive ID: ${driveId}`,
    '',
    `Employer view: ${abs}`,
  ];
  if (webmail) {
    lines.push('', `Read system mail in your configured webmail: ${webmail}`);
  }

  await sendMail({
    to,
    subject: `[PlacementHub] Drive approved — ${driveTitle}`,
    text: lines.join('\n'),
  });
}
