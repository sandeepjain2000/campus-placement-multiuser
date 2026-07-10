import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

const PPO_LINK = '/dashboard/student/internship-ppo';

/**
 * Alert + email when employer confirms PPO (student must accept/decline PPO before job offer).
 */
export async function notifyStudentInternshipPpoConfirmed({
  studentUserId,
  email,
  firstName,
  companyName,
  internshipTitle,
  employerNotes,
}) {
  const origin = appOrigin();
  const link = origin ? `${origin}${PPO_LINK}` : PPO_LINK;
  const title = `Pre-Placement Offer (PPO) — ${companyName}`;
  const message = `${companyName} has confirmed a Pre-Placement Offer for your internship (${internshipTitle}). Accept or decline the PPO on PlacementHub — this is separate from your formal job offer letter.`;

  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [studentUserId, title, message, 'success', PPO_LINK],
    );
  } catch (err) {
    console.error('Failed to create PPO in-app notification:', err);
  }

  const notesBlock = employerNotes
    ? `<p style="margin: 12px 0; padding: 12px 14px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;"><strong>Note from employer:</strong> ${escapeHtml(employerNotes)}</p>`
    : '';

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d9488; padding: 20px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff;">Pre-Placement Offer (PPO)</h2>
      </div>
      <div style="padding: 20px; line-height: 1.55;">
        <p>Hi ${escapeHtml(firstName || 'there')},</p>
        <p><strong>${escapeHtml(companyName)}</strong> has confirmed a <strong>Pre-Placement Offer (PPO)</strong> following your internship for <strong>${escapeHtml(internshipTitle)}</strong>.</p>
        <p style="margin: 12px 0; padding: 12px 14px; background: #ecfdf5; border-radius: 6px; border: 1px solid #a7f3d0; color: #065f46;">
          A PPO is <strong>not</strong> your internship selection and <strong>not</strong> the final job offer letter. Please <strong>accept or decline the PPO</strong> on PlacementHub. If you accept, the employer may then issue a separate <strong>formal job offer</strong> on My Offers.
        </p>
        ${notesBlock}
        <div style="margin: 24px 0; text-align: center;">
          <a href="${link}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Respond to PPO</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Hi ${firstName || 'there'},`,
    '',
    `${companyName} has confirmed a Pre-Placement Offer (PPO) for your internship: ${internshipTitle}.`,
    'This is separate from internship selection and from the formal job offer letter.',
    'Accept or decline the PPO on PlacementHub before the employer can issue the job offer.',
    employerNotes ? `Employer note: ${employerNotes}` : '',
    `Respond: ${link}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await sendMail({
      to: email,
      subject: `[PlacementHub] PPO confirmation — ${companyName}`,
      text,
      html,
      context: 'internship_ppo_confirmed',
      recipientUserId: studentUserId,
    });
  } catch (err) {
    console.error('Failed to send PPO confirmation email:', err);
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
