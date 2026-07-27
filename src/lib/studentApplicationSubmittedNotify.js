import { query } from '@/lib/db';
import { mirrorInAppAlertToYopmail } from '@/lib/notificationService';
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
    await mirrorInAppAlertToYopmail({
      title: clipNotificationTitle(alert.title),
      message: alert.message,
      type: 'success',
      link: linkPath,
      audience: '1 student',
      recipientEmail: email || null,
      userId: studentUserId,
    });
  } catch (err) {
    console.error('Failed to create application submitted in-app notification:', err);
  }

  const to = String(email || '').trim();
  if (!to) return;

  try {
    const { sendApplicationSubmitted } = await import('@/lib/email/sendApplicationStatus');
    await sendApplicationSubmitted({
      to,
      firstName,
      company: alert.company,
      role: alert.role,
      typeLabel: alert.typeLabel,
      applicationId,
      applicationsUrl: absLink,
      recipientUserId: studentUserId,
    });
  } catch (err) {
    console.error('Failed to send application submitted email:', err);
  }
}
