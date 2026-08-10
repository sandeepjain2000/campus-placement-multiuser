import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';
import { notifyRole } from '@/lib/ipNotify';

export async function GET() {
  const { session, error } = await requireSession(['candidate', 'employer', 'superadmin']);
  if (error) return error;
  const result = await query(
    `SELECT fi.*, u.name as author_name,
            EXISTS(SELECT 1 FROM ip_feature_idea_votes v WHERE v.idea_id = fi.id AND v.user_id = $1) as voted_by_me
     FROM ip_feature_ideas fi LEFT JOIN ip_users u ON u.id = fi.author_user_id
     ORDER BY fi.vote_count DESC, fi.created_at DESC`,
    [session.user.id],
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
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  if (!title || !description) return jsonError('Title and description are required');

  const id = newId('ip_idea');
  await query(
    `INSERT INTO ip_feature_ideas (id, author_user_id, title, description, topics)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, session.user.id, title, description, body.topics || []],
  );
  await notifyRole({ role: 'superadmin', title: 'New feature idea', body: title, link: '/superadmin/feature-ideas' });
  return jsonOk({ ok: true, id }, 201);
}
