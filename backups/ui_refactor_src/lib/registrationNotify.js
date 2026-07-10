import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';

/**
 * Inboxes that receive platform-level alerts (e.g. new employer/college registrations).
 * Merges DB super_admins with SUPERADMIN_NOTIFY_EMAILS (comma-separated), deduped.
 */
async function superAdminNotifyRecipients() {
  const r = await query(
    `SELECT email FROM users WHERE role = 'super_admin' AND is_active = true`
  );
  const fromDb = r.rows.map((x) => x.email).filter(Boolean);
  const fromEnv = (process.env.SUPERADMIN_NOTIFY_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const e of [...fromDb, ...fromEnv]) {
    const k = e.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

async function collegeAdminEmails(tenantId) {
  const r = await query(
    `SELECT email FROM users
     WHERE tenant_id = $1::uuid AND role = 'college_admin' AND is_active = true`,
    [tenantId]
  );
  return r.rows.map((x) => x.email).filter(Boolean);
}

export async function notifyRegistrationSubmitted({ role, email, firstName, tenantName, companyName }) {
  const admins = await superAdminNotifyRecipients();
  const label =
    role === 'college_admin'
      ? `College: ${tenantName || '—'}`
      : role === 'employer'
        ? `Employer: ${companyName || '—'}`
        : `Student: ${firstName || ''}`;

  if (admins.length && (role === 'college_admin' || role === 'employer')) {
    await sendMail({
      to: admins,
      subject: `[PlacementHub] New ${role === 'college_admin' ? 'college' : 'employer'} registration pending review`,
      text: [
        `A new ${role} account is awaiting platform approval.`,
        '',
        `Registrant: ${firstName} <${email}>`,
        label,
        '',
        'Review pending registrations: /dashboard/admin/pending-registrations',
      ].join('\n'),
    });
  }

  if (role === 'college_admin' || role === 'employer') {
    await sendMail({
      to: email,
      subject: '[PlacementHub] We received your registration',
      text: [
        `Hi ${firstName},`,
        '',
        'Thanks for registering on PlacementHub. Your account is pending approval by the platform team.',
        'You will receive another email when your account is activated.',
        '',
        'If you did not sign up, you can ignore this message.',
      ].join('\n'),
    });
  }
}

export async function notifyRegistrationResolved({ email, firstName, approved, reason, role }) {
  await sendMail({
    to: email,
    subject: approved
      ? '[PlacementHub] Your account is approved'
      : '[PlacementHub] Registration update',
    text: approved
      ? [
          `Hi ${firstName},`,
          '',
          'Your PlacementHub account has been approved. You can sign in with the email and password you chose at registration.',
          '',
          `Role: ${role}`,
        ].join('\n')
      : [
          `Hi ${firstName},`,
          '',
          'Your PlacementHub registration was not approved for this workspace.',
          reason ? `Note: ${reason}` : '',
          '',
          'If you believe this is a mistake, contact your placement office or platform support.',
        ]
          .filter(Boolean)
          .join('\n'),
  });
}

export async function notifyStudentRegistered({ studentEmail, firstName, tenantId, collegeName }) {
  await sendMail({
    to: studentEmail,
    subject: '[PlacementHub] Registration received',
    text: [
      `Hi ${firstName},`,
      '',
      `Your student account was created for ${collegeName || 'your institution'}.`,
      'Your placement office may need to verify you before all placement features unlock.',
      '',
      'You can sign in with the email and password you used at registration.',
    ].join('\n'),
  });

  const admins = await collegeAdminEmails(tenantId);
  if (admins.length) {
    await sendMail({
      to: admins,
      subject: `[PlacementHub] New student signup: ${firstName}`,
      text: [
        'A student completed self-registration for your campus.',
        '',
        `Name: ${firstName}`,
        `Email: ${studentEmail}`,
        '',
        'Review and verify the student from the Students screen when ready.',
      ].join('\n'),
    });
  }
}

export async function notifyCollegeEnrollmentKey({ collegeAdminEmail, firstName, collegeName, surfaceToken }) {
  await sendMail({
    to: collegeAdminEmail,
    subject: '[PlacementHub] Campus enrollment key (share with students)',
    text: [
      `Hi ${firstName},`,
      '',
      `Your institution "${collegeName}" is approved on PlacementHub.`,
      '',
      'Students must enter this enrollment key when they register:',
      surfaceToken,
      '',
      'You can also copy it anytime from College Administration → Enrollment key.',
      '',
      'Treat this like a password: only share it through official channels.',
    ].join('\n'),
  });
}
