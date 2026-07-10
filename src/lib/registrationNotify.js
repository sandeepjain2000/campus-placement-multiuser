import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

/**
 * Inboxes that receive platform-level alerts (e.g. new employer/college registrations).
 * Merges DB super_admins with SUPERADMIN_NOTIFY_EMAILS (comma-separated), deduped.
 */
async function superAdminNotifyRecipients() {
  const r = await query(
    `SELECT COALESCE(NULLIF(communication_email, ''), email) AS email FROM users WHERE role = 'super_admin' AND is_active = true`
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
    `SELECT COALESCE(NULLIF(communication_email, ''), email) AS email FROM users
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
    const abs = `${appOrigin()}/dashboard/admin/pending-registrations`;
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f59e0b; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #ffffff;">Action Required: Pending Registration</h2>
        </div>
        <div style="padding: 20px;">
          <p>A new <strong>${role}</strong> account has requested access and is awaiting platform approval.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">Name</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${firstName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Email</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${email}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Entity</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${label}</td></tr>
          </table>
          <a href="${abs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Review Registration</a>
        </div>
      </div>
    `;
    await sendMail({
      to: admins,
      subject: `[PlacementHub] New ${role === 'college_admin' ? 'college' : 'employer'} registration pending review`,
      text: `A new ${role} account is awaiting platform approval.\n\nRegistrant: ${firstName} <${email}>\n${label}\n\nReview pending registrations: ${abs}`,
      html,
      context: 'registration_pending_superadmin',
    });
  }

  if (role === 'college_admin' || role === 'employer') {
    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #1f2937;">Registration Received</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi ${firstName},</p>
          <p>Thanks for registering on PlacementHub. Your account is currently <strong>pending approval</strong> by the platform team to ensure security and validity.</p>
          <p><strong>Important:</strong> use the <em>Verify your email</em> link we sent in a separate message. Platform approval can only be completed after your email is verified.</p>
          <p>You will receive another email as soon as your account is activated and ready to use.</p>
          <p style="margin-top: 30px; font-size: 13px; color: #6b7280;">If you did not sign up, you can safely ignore this message.</p>
        </div>
      </div>
    `;
    await sendMail({
      to: email,
      subject: '[PlacementHub] We received your registration',
      text: `Hi ${firstName},\n\nThanks for registering on PlacementHub. Your account is pending approval by the platform team.\nVerify your email using the separate message we sent, then wait for activation.\nYou will receive another email when your account is activated.\n\nIf you did not sign up, you can ignore this message.`,
      html,
      context: 'registration_received',
    });
  }
}

export async function notifyRegistrationResolved({ email, firstName, approved, reason, role }) {
  const abs = `${appOrigin()}/login`;
  
  const approvedHtml = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #ffffff;">Account Approved!</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${firstName},</p>
        <p>Great news! Your PlacementHub <strong>${role}</strong> account has been approved by our team.</p>
        <p>You can now sign in using the email and password you chose during registration.</p>
        <a href="${abs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">Sign In Now</a>
      </div>
    </div>
  `;
  
  const rejectedHtml = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #ffffff;">Registration Update</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${firstName},</p>
        <p>Unfortunately, your PlacementHub registration was not approved for this workspace.</p>
        ${reason ? `<div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 10px; border-radius: 4px; color: #991b1b; margin: 15px 0;"><strong>Note:</strong> ${reason}</div>` : ''}
        <p style="margin-top: 20px;">If you believe this is a mistake, please contact your placement office or platform support.</p>
      </div>
    </div>
  `;

  await sendMail({
    to: email,
    subject: approved
      ? '[PlacementHub] Your account is approved'
      : '[PlacementHub] Registration update',
    text: approved
      ? `Hi ${firstName},\n\nYour PlacementHub account has been approved. You can sign in with the email and password you chose at registration.\n\nRole: ${role}\nLogin here: ${abs}`
      : `Hi ${firstName},\n\nYour PlacementHub registration was not approved for this workspace.\n${reason ? `Note: ${reason}` : ''}\n\nIf you believe this is a mistake, contact your placement office or platform support.`,
    html: approved ? approvedHtml : rejectedHtml,
    context: approved ? 'registration_approved' : 'registration_rejected',
  });
}

export async function notifyStudentRegistered({ studentEmail, firstName, tenantId, collegeName }) {
  const loginAbs = `${appOrigin()}/login`;
  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #1f2937;">Registration Successful</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${firstName},</p>
        <p>Your student account was created for <strong>${collegeName || 'your institution'}</strong>.</p>
        <p><strong>Next step:</strong> open the <em>Verify your email</em> message we sent you and click the link. You can sign in only after your email is verified.</p>
        <p><em>Your placement office may still need to verify your profile before all placement features unlock.</em></p>
        <p style="font-size: 13px; color: #6b7280;">After you verify your email, you can use the PlacementHub login page with the password you chose.</p>
        <a href="${loginAbs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">Open login page</a>
      </div>
    </div>
  `;

  await sendMail({
    to: studentEmail,
    subject: '[PlacementHub] Registration received',
    text: `Hi ${firstName},\n\nYour student account was created for ${collegeName || 'your institution'}.\n\nVerify your email using the link we sent you, then sign in with your password.\nYour placement office may still need to verify you before all placement features unlock.\n`,
    html,
    context: 'student_registration_received',
  });

  const admins = await collegeAdminEmails(tenantId);
  if (admins.length) {
    const adminAbs = `${appOrigin()}/dashboard/college/students`;
    const adminHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #1f2937;">New Student Signup</h2>
        </div>
        <div style="padding: 20px;">
          <p>A new student has completed self-registration for your campus.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;">Name</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${firstName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Email</td><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${studentEmail}</td></tr>
          </table>
          <p>Please review and verify the student from your dashboard when ready.</p>
          <a href="${adminAbs}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Review Student</a>
        </div>
      </div>
    `;
    await sendMail({
      to: admins,
      subject: `[PlacementHub] New student signup: ${firstName}`,
      text: `A student completed self-registration for your campus.\n\nName: ${firstName}\nEmail: ${studentEmail}\n\nReview and verify the student from the Students screen when ready: ${adminAbs}`,
      html: adminHtml,
      context: 'student_registration_college_admin',
    });
  }
}

export async function notifyCollegeEnrollmentKey({ collegeAdminEmail, firstName, collegeName, surfaceToken }) {
  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; color: #1f2937;">Your Campus Enrollment Key</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${firstName},</p>
        <p>Your institution <strong>"${collegeName}"</strong> is now approved on PlacementHub!</p>
        <p>Students must enter the following enrollment key when they register to automatically join your campus workspace:</p>
        
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0f172a;">${surfaceToken}</span>
        </div>
        
        <p>You can also copy it anytime from <strong>College Administration → Enrollment key</strong>.</p>
        <p style="color: #b91c1c; font-size: 14px; margin-top: 20px;"><strong>Important:</strong> Treat this key like a password. Only share it with your students through official, secure college channels.</p>
      </div>
    </div>
  `;

  await sendMail({
    to: collegeAdminEmail,
    subject: '[PlacementHub] Campus enrollment key (share with students)',
    text: `Hi ${firstName},\n\nYour institution "${collegeName}" is approved on PlacementHub.\n\nStudents must enter this enrollment key when they register:\n${surfaceToken}\n\nYou can also copy it anytime from College Administration → Enrollment key.\n\nTreat this like a password: only share it through official channels.`,
    html,
    context: 'college_enrollment_key',
  });
}
