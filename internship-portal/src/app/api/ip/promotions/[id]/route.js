import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';
import { LINKEDIN_PROMO_CREDITS, LINKEDIN_PROMO_POINTS } from '@/lib/pointsEconomy';
import { notifyUser } from '@/lib/ipNotify';

async function loadPromo(id) {
  const result = await query(
    `SELECT p.*, e.user_id as employer_user_id, i.title
     FROM ip_linkedin_promotions p
     JOIN ip_employers e ON e.id = p.employer_id
     JOIN ip_internships i ON i.id = p.internship_id
     WHERE p.id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

async function rewardPromo(promo) {
  await query(
    `UPDATE ip_users SET points = points + $2, free_post_credits = free_post_credits + $3, updated_at = now()
     WHERE id = $1`,
    [promo.employer_user_id, LINKEDIN_PROMO_POINTS, LINKEDIN_PROMO_CREDITS],
  );
  await query(
    `INSERT INTO ip_points_ledger (id, user_id, delta, reason, meta)
     VALUES ($1,$2,$3,'linkedin_promotion_verified',$4::jsonb)`,
    [newId('ip_pts'), promo.employer_user_id, LINKEDIN_PROMO_POINTS, JSON.stringify({ promoId: promo.id })],
  );
  await query(
    `UPDATE ip_linkedin_promotions
     SET status = 'rewarded', points_awarded = $2, credits_awarded = $3, updated_at = now()
     WHERE id = $1`,
    [promo.id, LINKEDIN_PROMO_POINTS, LINKEDIN_PROMO_CREDITS],
  );
  await notifyUser({
    userId: promo.employer_user_id,
    title: 'LinkedIn promotion verified',
    body: `Rewards added for ${promo.title}: +${LINKEDIN_PROMO_POINTS} points, +${LINKEDIN_PROMO_CREDITS} posting credit.`,
    link: '/employer/referral',
  });
}

/** Employer: submit post URL for fast-track. SuperAdmin: verify/fail. */
export async function PATCH(request, { params }) {
  const { session, error } = await requireSession(['employer', 'superadmin']);
  if (error) return error;
  const { id } = await params;
  const promo = await loadPromo(id);
  if (!promo) return jsonError('Not found', 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  if (session.user.role === 'employer') {
    if (promo.employer_user_id !== session.user.id) return jsonError('Forbidden', 403);
    const postUrl = String(body.claimedPostUrl || body.claimed_post_url || '').trim();
    if (!postUrl) return jsonError('claimedPostUrl is required for fast-track');
    await query(
      `UPDATE ip_linkedin_promotions
       SET claimed_post_url = $2, status = 'fast_track_pending', updated_at = now()
       WHERE id = $1`,
      [id, postUrl],
    );
    return jsonOk({ ok: true, status: 'fast_track_pending' });
  }

  const action = String(body.action || '').toLowerCase();
  const notes = body.notes || null;
  if (!['verify', 'fail'].includes(action)) return jsonError('action must be verify or fail');

  if (action === 'fail') {
    await query(
      `UPDATE ip_linkedin_promotions
       SET status = 'failed', review_notes = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
       WHERE id = $1`,
      [id, notes, session.user.id],
    );
    await notifyUser({
      userId: promo.employer_user_id,
      title: 'LinkedIn promotion not verified',
      body: notes || `Could not verify promotion for ${promo.title}.`,
      link: '/employer/internships',
    });
    return jsonOk({ ok: true, status: 'failed' });
  }

  await query(
    `UPDATE ip_linkedin_promotions
     SET status = 'verified', review_notes = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
     WHERE id = $1`,
    [id, notes, session.user.id],
  );
  const fresh = await loadPromo(id);
  await rewardPromo(fresh);
  return jsonOk({ ok: true, status: 'rewarded' });
}
