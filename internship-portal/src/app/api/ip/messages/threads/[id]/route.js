import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';
import { notifyUser } from '@/lib/ipNotify';

async function loadThread(id, uid) {
  const result = await query(
    `SELECT t.*,
            i.title as internship_title,
            cu.name as candidate_name,
            eu.name as employer_name,
            e.company_name,
            (SELECT m.body FROM ip_messages m WHERE m.thread_id = t.id ORDER BY m.sent_at DESC LIMIT 1) as last_message
     FROM ip_message_threads t
     LEFT JOIN ip_internships i ON i.id = t.internship_id
     LEFT JOIN ip_users cu ON cu.id = t.candidate_user_id
     LEFT JOIN ip_users eu ON eu.id = t.employer_user_id
     LEFT JOIN ip_employers e ON e.user_id = t.employer_user_id
     WHERE t.id = $1 AND (t.candidate_user_id = $2 OR t.employer_user_id = $2)`,
    [id, uid],
  );
  return result.rows[0] || null;
}

export async function GET(request, { params }) {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;
  const { id } = await params;
  const thread = await loadThread(id, session.user.id);
  if (!thread) return jsonError('Thread not found', 404);

  await query(
    `UPDATE ip_messages SET read_at = now() WHERE thread_id = $1 AND sender_user_id != $2 AND read_at IS NULL`,
    [id, session.user.id],
  );

  const messages = await query(
    `SELECT m.*, u.name as sender_name, u.role as sender_role FROM ip_messages m JOIN ip_users u ON u.id = m.sender_user_id
     WHERE thread_id = $1 ORDER BY sent_at ASC`,
    [id],
  );
  return jsonOk({ thread, messages: messages.rows });
}

export async function POST(request, { params }) {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;
  const { id } = await params;
  const thread = await loadThread(id, session.user.id);
  if (!thread) return jsonError('Thread not found', 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const text = String(body.message || '').trim();
  if (!text) return jsonError('Message body is required');

  await query(`INSERT INTO ip_messages (id, thread_id, sender_user_id, body) VALUES ($1,$2,$3,$4)`, [
    newId('ip_msg'), id, session.user.id, text,
  ]);
  await query(`UPDATE ip_message_threads SET updated_at = now() WHERE id = $1`, [id]);

  const otherUserId = session.user.id === thread.candidate_user_id ? thread.employer_user_id : thread.candidate_user_id;
  const otherLink =
    otherUserId === thread.candidate_user_id
      ? `/candidate/messages/${id}`
      : `/employer/messages/${id}`;
  await notifyUser({ userId: otherUserId, title: 'New message', body: text.slice(0, 120), link: otherLink });

  return jsonOk({ ok: true });
}
