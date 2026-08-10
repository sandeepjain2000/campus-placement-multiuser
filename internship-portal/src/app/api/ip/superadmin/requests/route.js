import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId, randomPassword, referralCodeFrom } from '@/lib/ids';
import { sendMail, tempPasswordEmailHtml } from '@/lib/mail';

export async function GET(request) {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const where = status ? `WHERE status = $1` : '';
  const params = status ? [status] : [];
  const result = await query(`SELECT * FROM ip_employer_requests ${where} ORDER BY created_at DESC`, params);
  return jsonOk({ items: result.rows });
}

/** SuperAdmin creates an employer account from a manual request. */
export async function POST(request) {
  const { session, error } = await requireSession(['superadmin']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const requestId = String(body.requestId || '');
  const req = await query(`SELECT * FROM ip_employer_requests WHERE id = $1`, [requestId]);
  const row = req.rows[0];
  if (!row) return jsonError('Request not found', 404);
  if (row.status !== 'pending') return jsonError('Request already processed', 409);

  const existing = await query(`SELECT id FROM ip_users WHERE lower(email) = $1`, [row.contact_email.toLowerCase()]);
  if (existing.rows[0]) return jsonError('An account with this email already exists', 409);

  const password = randomPassword(12);
  const hash = await bcrypt.hash(password, 10);
  const userId = newId('ip_user');
  const employerId = newId('ip_emp');
  const name = row.contact_name || row.company_name;

  await query('BEGIN');
  try {
    await query(
      `INSERT INTO ip_users (id, email, password_hash, role, name, points, free_post_credits, referral_code)
       VALUES ($1,$2,$3,'employer',$4,50,1,$5)`,
      [userId, row.contact_email, hash, name, referralCodeFrom(name)],
    );
    await query(
      `INSERT INTO ip_employers (id, user_id, company_name, website, work_email, contact_name, approval_status)
       VALUES ($1,$2,$3,$4,$5,$6,'approved')`,
      [employerId, userId, row.company_name, row.website, row.contact_email, row.contact_name],
    );
    await query(
      `UPDATE ip_employer_requests SET status = 'approved', created_user_id = $2, reviewed_at = now(), reviewer_id = $3 WHERE id = $1`,
      [requestId, userId, session.user.id],
    );
    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }

  try {
    await sendMail({
      to: row.contact_email,
      subject: 'Your Internship Portal employer account is ready',
      html: tempPasswordEmailHtml({ name, email: row.contact_email, password }),
      text: `Temporary password: ${password}`,
    });
  } catch (e) {
    console.error('[superadmin requests] mail failed', e.message);
  }

  return jsonOk({ ok: true, userId, employerId });
}

/** SuperAdmin rejects a manual employer request. */
export async function PATCH(request) {
  const { session, error } = await requireSession(['superadmin']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const requestId = String(body.id || body.requestId || '');
  const status = String(body.status || 'rejected');
  if (!requestId) return jsonError('id is required');
  if (!['approved', 'rejected'].includes(status)) return jsonError('Invalid status');

  if (status === 'approved') {
    return POST(new Request(request.url, { method: 'POST', body: JSON.stringify({ requestId }), headers: { 'Content-Type': 'application/json' } }));
  }

  const result = await query(
    `UPDATE ip_employer_requests SET status = 'rejected', reviewed_at = now(), reviewer_id = $2 WHERE id = $1 AND status = 'pending' RETURNING id`,
    [requestId, session.user.id],
  );
  if (!result.rows.length) return jsonError('Request not found or already processed', 404);
  return jsonOk({ ok: true, message: 'Request rejected' });
}
