import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { notifyUser } from '@/lib/ipNotify';
import { sendMail } from '@/lib/mail';

const ALLOWED = ['approved', 'rejected', 'suspended', 'pending'];

export async function PATCH(request, { params }) {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const status = String(body.approvalStatus || '');
  if (!ALLOWED.includes(status)) return jsonError(`approvalStatus must be one of ${ALLOWED.join(', ')}`);

  const result = await query(
    `UPDATE ip_employers SET approval_status = $2, updated_at = now() WHERE id = $1
     RETURNING user_id, company_name`,
    [id, status],
  );
  const row = result.rows[0];
  if (!row) return jsonError('Not found', 404);

  await notifyUser({
    userId: row.user_id,
    title: `Employer account ${status}`,
    body: row.company_name,
    link: '/employer',
  });
  try {
    const emailRow = await query(`SELECT email, name FROM ip_users WHERE id = $1`, [row.user_id]);
    await sendMail({
      to: emailRow.rows[0]?.email,
      subject: `Your employer account was ${status}`,
      html: `<p>Hi ${emailRow.rows[0]?.name || ''},</p><p>Your Internship Portal employer account (${row.company_name}) status is now: <strong>${status}</strong>.</p>`,
      text: `Your employer account status: ${status}`,
    });
  } catch (e) {
    console.error('[superadmin employer status] mail failed', e.message);
  }

  return jsonOk({ ok: true });
}
