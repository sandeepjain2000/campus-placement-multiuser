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

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #1f2937;">New Placement Drive Request</h2>
      </div>
      <div style="padding: 20px;">
        <p>A new placement drive request was submitted by <strong>${companyName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">Company</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${companyName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">College</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${collegeName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Drive Title</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${driveTitle}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Date</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${driveDateLabel}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Type</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${String(driveType || '').replace(/_/g, ' ')}</td></tr>
        </table>
        <p>College admins can review and approve this drive in the dashboard.</p>
        <a href="${abs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Review Request</a>
        ${webmail ? `<p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Read system mail in your configured webmail: <a href="${webmail}">${webmail}</a></p>` : ''}
      </div>
    </div>
  `;

  await sendMail({
    to,
    subject: `[PlacementHub] Drive requested — ${driveTitle}`,
    text: `A new placement drive request was submitted by ${companyName}.\n\nDrive: ${driveTitle}\nDate: ${driveDateLabel}\n\nReview here: ${abs}`,
    html,
    context: 'placement_drive_requested',
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

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #ffffff;">Placement Drive Approved</h2>
      </div>
      <div style="padding: 20px;">
        <p>Good news! Your placement drive at <strong>${collegeName}</strong> has been approved.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">Drive Title</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${driveTitle}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">College</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${collegeName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Date</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${driveDateLabel}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Type</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${String(driveType || '').replace(/_/g, ' ')}</td></tr>
        </table>
        <p>You can now manage your drive, schedule interviews, and publish offers through the employer dashboard.</p>
        <a href="${abs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
        ${webmail ? `<p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Read system mail in your configured webmail: <a href="${webmail}">${webmail}</a></p>` : ''}
      </div>
    </div>
  `;

  await sendMail({
    to,
    subject: `[PlacementHub] Drive approved — ${driveTitle}`,
    text: `Your placement drive at ${collegeName} has been approved.\n\nDrive: ${driveTitle}\nDate: ${driveDateLabel}\n\nView here: ${abs}`,
    html,
    context: 'placement_drive_approved',
  });
}
