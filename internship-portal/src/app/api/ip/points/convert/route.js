import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';
import { POINTS_PER_FREE_POST_CREDIT } from '@/lib/pointsEconomy';

/**
 * Employer only: convert points → free internship posting credits.
 * Candidates do NOT convert — their points are spent directly when applying.
 */
export async function POST(request) {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;

  if (session.user.role === 'candidate') {
    return jsonError(
      'Candidates do not convert points. Points are spent directly when you apply to an internship.',
      400,
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok */
  }

  const units = Math.max(1, Math.min(20, Number(body.units) || 1));
  const user = await query(
    `SELECT id, role, points, free_post_credits FROM ip_users WHERE id = $1`,
    [session.user.id],
  );
  const row = user.rows[0];
  if (!row) return jsonError('User not found', 404);

  const cost = POINTS_PER_FREE_POST_CREDIT * units;
  if (row.points < cost) {
    return jsonError(`Need ${cost} points for ${units} free posting credit(s). You have ${row.points}.`, 400);
  }
  await query(
    `UPDATE ip_users SET points = points - $2, free_post_credits = free_post_credits + $3, updated_at = now() WHERE id = $1`,
    [row.id, cost, units],
  );
  await query(
    `INSERT INTO ip_points_ledger (id, user_id, delta, reason, meta)
     VALUES ($1,$2,$3,'convert_to_post_credits',$4::jsonb)`,
    [newId('ip_pts'), row.id, -cost, JSON.stringify({ units, rate: POINTS_PER_FREE_POST_CREDIT })],
  );
  return jsonOk({ ok: true, spent: cost, credited: units, type: 'free_post_credits' });
}
