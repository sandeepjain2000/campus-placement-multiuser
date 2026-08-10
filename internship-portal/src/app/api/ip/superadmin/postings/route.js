import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { notifyUser } from '@/lib/ipNotify';

export async function GET(request) {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const status = new URL(request.url).searchParams.get('status') || '';
  const params = [];
  const where = ['1=1'];
  if (status) {
    params.push(status);
    where.push(`i.status = $${params.length}`);
  }
  const result = await query(
    `SELECT i.*, e.company_name, e.work_email,
            (SELECT count(*) FROM ip_applications a WHERE a.internship_id = i.id) as applicant_count
     FROM ip_internships i
     JOIN ip_employers e ON e.id = i.employer_id
     WHERE ${where.join(' AND ')}
     ORDER BY i.created_at DESC LIMIT 300`,
    params,
  );
  return jsonOk({ items: result.rows });
}

export async function PATCH(request) {
  const { session, error } = await requireSession(['superadmin']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const id = String(body.id || '');
  const status = String(body.status || '');
  if (!id || !['published', 'paused', 'closed', 'draft'].includes(status)) {
    return jsonError('id and status (published|paused|closed|draft) required');
  }
  const row = await query(
    `SELECT i.title, e.user_id FROM ip_internships i JOIN ip_employers e ON e.id = i.employer_id WHERE i.id = $1`,
    [id],
  );
  if (!row.rows[0]) return jsonError('Not found', 404);
  await query(`UPDATE ip_internships SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
  await notifyUser({
    userId: row.rows[0].user_id,
    title: 'Posting moderation update',
    body: `${row.rows[0].title} was set to ${status}${body.reason ? `: ${body.reason}` : ''}.`,
    link: '/employer/internships',
  });
  return jsonOk({ ok: true, moderatedBy: session.user.id });
}
