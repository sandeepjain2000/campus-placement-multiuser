import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';

export async function GET(request) {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;
  const user = await query(`SELECT referral_code, points, free_post_credits, application_allowance FROM ip_users WHERE id = $1`, [session.user.id]);
  const referrals = await query(
    `SELECT r.*, u.name as referred_name, u.email as referred_email, u.role as referred_role,
            e.company_name as referred_company,
            NULLIF(split_part(COALESCE(u.email, ''), '@', 2), '') as referred_domain
     FROM ip_referrals r
     LEFT JOIN ip_users u ON u.id = r.referred_user_id
     LEFT JOIN ip_employers e ON e.user_id = u.id
     WHERE r.referrer_user_id = $1
     ORDER BY r.created_at DESC`,
    [session.user.id],
  );
  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const code = user.rows[0]?.referral_code;
  const path = session.user.role === 'employer' ? '/register/employer' : '/register/candidate';
  return jsonOk({
    ...user.rows[0],
    referralLink: code ? `${origin}${path}?ref=${code}` : null,
    viralLink: code ? `${origin}/r/${code}` : null,
    referrals: referrals.rows,
  });
}
