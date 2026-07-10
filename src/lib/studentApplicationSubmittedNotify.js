import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { isAlumniJobType } from '@/lib/studentAlumni';

const NOTIFICATION_TITLE_MAX = 250;

const OPENING_TYPE_LABELS = {
  full_time: 'Full-time job',
  contract: 'Contract role',
  internship: 'Internship',
  short_project: 'Project',
  hackathon: 'Hackathon',
  ppo: 'PPO',
  part_time: 'Part-time job',
  mentorship: 'Mentorship',
  placement_drive: 'Placement drive',
};

function clipNotificationTitle(title) {
  const t = String(title ?? '').trim();
  if (t.length <= NOTIFICATION_TITLE_MAX) return t;
  return `${t.slice(0, NOTIFICATION_TITLE_MAX - 1)}…`;
}

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

export function formatOpeningTypeLabel(jobType, { sourceKind } = {}) {
  if (sourceKind === 'drive') return OPENING_TYPE_LABELS.placement_drive;
  const jt = String(jobType || '').trim().toLowerCase();
  if (OPENING_TYPE_LABELS[jt]) return OPENING_TYPE_LABELS[jt];
  if (isAlumniJobType(jt)) return OPENING_TYPE_LABELS[jt] || 'Alumni job';
  return jt.replace(/_/g, ' ') || 'Opening';
}

export function studentApplicationsLinkForOpening({ jobType, sourceKind } = {}) {
  if (sourceKind === 'drive') return '/dashboard/student/applications/drives';
  const jt = String(jobType || '').toLowerCase();
  if (jt === 'internship') return '/dashboard/student/applications/internships';
  if (jt === 'short_project') return '/dashboard/student/applications/projects';
  if (jt === 'hackathon') return '/dashboard/student/applications/hackathons';
  if (isAlumniJobType(jt)) return '/dashboard/student/applications/jobs';
  return '/dashboard/student/applications/internships';
}

/**
 * @param {{ companyName?: string, roleTitle?: string, jobType?: string, sourceKind?: 'program'|'drive', applicationId?: string }} opts
 */
export function buildStudentApplicationSubmittedAlert({
  companyName,
  roleTitle,
  jobType,
  sourceKind = 'program',
  applicationId,
}) {
  const company = String(companyName || '').trim() || 'Company';
  const role = String(roleTitle || '').trim() || 'Role';
  const typeLabel = formatOpeningTypeLabel(jobType, { sourceKind });
  const ref = applicationId ? ` Reference: ${String(applicationId).slice(0, 8)}.` : '';

  return {
    title: `Applied: ${role} at ${company}`,
    message: `Your ${typeLabel.toLowerCase()} application for ${role} at ${company} was received.${ref} Track status in My Applications.`,
    link: studentApplicationsLinkForOpening({ jobType, sourceKind }),
    typeLabel,
    company,
    role,
  };
}

/**
 * In-app alert + email when a student submits an application.
 * @param {{ studentUserId: string, email?: string | null, firstName?: string, companyName?: string, roleTitle?: string, jobType?: string, applicationId?: string, sourceKind?: 'program'|'drive' }} opts
 */
export async function notifyStudentApplicationSubmitted({
  studentUserId,
  email,
  firstName,
  companyName,
  roleTitle,
  jobType,
  applicationId,
  sourceKind = 'program',
}) {
  if (!studentUserId) return;

  const alert = buildStudentApplicationSubmittedAlert({
    companyName,
    roleTitle,
    jobType,
    sourceKind,
    applicationId,
  });
  const origin = appOrigin();
  const linkPath = alert.link;
  const absLink = origin ? `${origin}${linkPath}` : linkPath;

  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1::uuid, $2, $3, 'success', $4)`,
      [studentUserId, clipNotificationTitle(alert.title), alert.message, linkPath],
    );
  } catch (err) {
    console.error('Failed to create application submitted in-app notification:', err);
  }

  const to = String(email || '').trim();
  if (!to) return;

  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const subject = `[PlacementHub] Application received — ${alert.role} at ${alert.company}`;

  try {
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4f46e5; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #ffffff;">Application received</h2>
        </div>
        <div style="padding: 20px; line-height: 1.5;">
          <p>${greeting}</p>
          <p>We received your <strong>${alert.typeLabel.toLowerCase()}</strong> application.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">Company</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${alert.company}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Role</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${alert.role}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Type</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${alert.typeLabel}</td></tr>
            ${applicationId ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Reference</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 13px;">${String(applicationId).slice(0, 8)}</td></tr>` : ''}
          </table>
          <p>You can track status and updates in My Applications.</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${absLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Applications</a>
          </div>
          <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
            This is an automated confirmation from PlacementHub.
          </p>
        </div>
      </div>
    `;

    const text = `${greeting}\n\nWe received your ${alert.typeLabel.toLowerCase()} application.\n\nCompany: ${alert.company}\nRole: ${alert.role}\nType: ${alert.typeLabel}${applicationId ? `\nReference: ${String(applicationId).slice(0, 8)}` : ''}\n\nTrack status: ${absLink}`;

    await sendMail({
      to,
      subject,
      text,
      html,
      context: 'student_application_submitted',
      recipientUserId: studentUserId,
    });
  } catch (err) {
    console.error('Failed to send application submitted email:', err);
  }
}
