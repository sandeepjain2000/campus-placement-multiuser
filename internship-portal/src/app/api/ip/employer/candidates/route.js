import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';

/** Search searchable candidate profiles. Hides phone/email/CV per privacy rule. */
export async function GET(request) {
  const { error } = await requireSession(['employer']);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const skill = (searchParams.get('skill') || '').trim().toLowerCase();

  const where = ['c.searchable = true'];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(lower(c.college) LIKE $${params.length} OR lower(c.degree) LIKE $${params.length} OR lower(c.city) LIKE $${params.length})`);
  }
  if (skill) {
    params.push(skill);
    where.push(`EXISTS (SELECT 1 FROM unnest(c.skills) s WHERE lower(s) = $${params.length})`);
  }

  const result = await query(
    `SELECT c.id, c.user_id, c.name, c.college, c.degree, c.specialization, c.city, c.state, c.skills,
            c.study_status, c.graduation_year, c.show_completed_internships,
            CASE WHEN c.show_profile_picture THEN c.profile_picture_url ELSE NULL END AS profile_picture_url,
            c.has_wired_broadband, c.has_dedicated_laptop,
            c.preferred_hours_start, c.preferred_hours_end,
            c.ongoing_commitment, c.ongoing_commitment_note
     FROM ip_candidates c WHERE ${where.join(' AND ')} ORDER BY c.updated_at DESC LIMIT 100`,
    params,
  );
  return jsonOk({ items: result.rows });
}
