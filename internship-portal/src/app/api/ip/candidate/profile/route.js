import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';

const EDITABLE_FIELDS = [
  'name', 'phone', 'profile_picture_url', 'show_profile_picture', 'college', 'degree', 'specialization',
  'study_status', 'graduation_year', 'cgpa', 'city', 'state', 'skills', 'resume_url', 'linkedin_url',
  'github_url', 'portfolio_url', 'preferred_work_mode', 'preferred_locations', 'availability_date',
  'searchable', 'show_completed_internships', 'whatsapp_opt_in', 'telegram_opt_in',
  'has_wired_broadband', 'has_dedicated_laptop', 'preferred_hours_start', 'preferred_hours_end',
  'ongoing_commitment', 'ongoing_commitment_note',
];

const REQUIRED_FOR_COMPLETE = ['name', 'phone', 'college', 'degree', 'city', 'resume_url'];

function normalizeOptionalBool(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value === true || value === 'true' || value === 'yes') return true;
  if (value === false || value === 'false' || value === 'no') return false;
  return null;
}

export async function GET() {
  const { session, error } = await requireSession(['candidate']);
  if (error) return error;
  const result = await query(
    `SELECT c.*, u.email as account_email, u.points, u.application_allowance, u.referral_code, u.profile_complete
     FROM ip_candidates c JOIN ip_users u ON u.id = c.user_id
     WHERE c.user_id = $1`,
    [session.user.id],
  );
  if (!result.rows[0]) return jsonError('Profile not found', 404);
  return jsonOk({ profile: result.rows[0] });
}

export async function PUT(request) {
  const { session, error } = await requireSession(['candidate']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const optionalBools = new Set([
    'has_wired_broadband', 'has_dedicated_laptop', 'ongoing_commitment',
  ]);

  const sets = [];
  const params = [session.user.id];
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (optionalBools.has(field)) value = normalizeOptionalBool(value);
    if (field === 'show_profile_picture') value = value !== false && value !== 'false';
    params.push(value);
    sets.push(`${field} = $${params.length}`);
  }
  if (sets.length) {
    await query(`UPDATE ip_candidates SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $1`, params);
  }

  const merged = await query(`SELECT * FROM ip_candidates WHERE user_id = $1`, [session.user.id]);
  const row = merged.rows[0] || {};
  const complete = REQUIRED_FOR_COMPLETE.every((f) => row[f] !== null && row[f] !== undefined && String(row[f]).trim() !== '');
  await query(`UPDATE ip_users SET profile_complete = $2, updated_at = now() WHERE id = $1`, [session.user.id, complete]);

  return jsonOk({ ok: true, profileComplete: complete });
}
