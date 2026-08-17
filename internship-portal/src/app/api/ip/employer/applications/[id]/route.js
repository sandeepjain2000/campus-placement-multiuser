import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { notifyUser } from '@/lib/ipNotify';

const ALLOWED = ['shortlisted', 'interviewing', 'rejected', 'hired', 'applied'];

export async function PATCH(request, { params }) {
  const { session, error } = await requireSession(['employer']);
  if (error) return error;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const status = String(body.status || '');
  if (!ALLOWED.includes(status)) return jsonError(`status must be one of ${ALLOWED.join(', ')}`);

  const emp = await query(`SELECT id FROM ip_employers WHERE user_id = $1`, [session.user.id]);
  const app = await query(
    `SELECT a.id, i.employer_id, i.title, c.user_id as candidate_user_id
     FROM ip_applications a JOIN ip_internships i ON i.id = a.internship_id JOIN ip_candidates c ON c.id = a.candidate_id
     WHERE a.id = $1`,
    [id],
  );
  const row = app.rows[0];
  if (!row || row.employer_id !== emp.rows[0]?.id) return jsonError('Not found', 404);

  await query(`UPDATE ip_applications SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
  await notifyUser({
    userId: row.candidate_user_id,
    title: `Application ${status}`,
    body: row.title,
    link: '/candidate/applications',
    category: 'application',
  });
  return jsonOk({ ok: true });
}
