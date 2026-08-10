import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';

export async function GET() {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;
  const uid = session.user.id;
  const result = await query(
    `SELECT t.*,
            i.title as internship_title,
            cu.name as candidate_name,
            eu.name as employer_name,
            e.company_name,
            (SELECT body FROM ip_messages m WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1) as last_message,
            (SELECT sent_at FROM ip_messages m WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1) as last_message_at,
            (SELECT u.name FROM ip_messages m JOIN ip_users u ON u.id = m.sender_user_id
              WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1) as last_sender_name,
            (SELECT count(*) FROM ip_messages m WHERE m.thread_id = t.id) as message_count,
            (SELECT count(*) FROM ip_messages m WHERE m.thread_id = t.id AND m.sender_user_id != $1 AND m.read_at IS NULL) as unread_count
     FROM ip_message_threads t
     LEFT JOIN ip_internships i ON i.id = t.internship_id
     LEFT JOIN ip_users cu ON cu.id = t.candidate_user_id
     LEFT JOIN ip_users eu ON eu.id = t.employer_user_id
     LEFT JOIN ip_employers e ON e.user_id = t.employer_user_id
     WHERE t.candidate_user_id = $1 OR t.employer_user_id = $1
     ORDER BY COALESCE(
       (SELECT sent_at FROM ip_messages m WHERE m.thread_id = t.id ORDER BY sent_at DESC LIMIT 1),
       t.updated_at
     ) DESC`,
    [uid],
  );
  return jsonOk({ items: result.rows });
}

export async function POST(request) {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const internshipId = body.internshipId || null;
  const otherUserId = String(body.otherUserId || '');
  const message = String(body.message || '').trim();
  if (!otherUserId) return jsonError('otherUserId is required');

  const isEmployer = session.user.role === 'employer';
  const employerUserId = isEmployer ? session.user.id : otherUserId;
  const candidateUserId = isEmployer ? otherUserId : session.user.id;

  const existing = await query(
    `SELECT id FROM ip_message_threads
     WHERE candidate_user_id = $1 AND employer_user_id = $2 AND (internship_id = $3 OR ($3 IS NULL AND internship_id IS NULL))`,
    [candidateUserId, employerUserId, internshipId],
  );
  let threadId = existing.rows[0]?.id;
  if (!threadId) {
    threadId = newId('ip_thread');
    let title = null;
    if (internshipId) {
      const int = await query(`SELECT title FROM ip_internships WHERE id = $1`, [internshipId]);
      title = int.rows[0]?.title || null;
    }
    await query(
      `INSERT INTO ip_message_threads (id, internship_id, candidate_user_id, employer_user_id, subject)
       VALUES ($1,$2,$3,$4,$5)`,
      [threadId, internshipId, candidateUserId, employerUserId, title],
    );
  }

  if (message) {
    await query(
      `INSERT INTO ip_messages (id, thread_id, sender_user_id, body) VALUES ($1,$2,$3,$4)`,
      [newId('ip_msg'), threadId, session.user.id, message],
    );
    await query(`UPDATE ip_message_threads SET updated_at = now() WHERE id = $1`, [threadId]);
  }

  return jsonOk({ ok: true, threadId }, 201);
}
