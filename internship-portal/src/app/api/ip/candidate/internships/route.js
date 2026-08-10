import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';

function matchScore(candidateSkills, eligibility) {
  const skills = eligibility?.skills;
  if (!Array.isArray(skills) || !skills.length) return 100;
  const have = new Set((candidateSkills || []).map((s) => String(s).toLowerCase()));
  const hits = skills.filter((s) => have.has(String(s).toLowerCase())).length;
  return Math.round((hits / skills.length) * 100);
}

export async function GET(request) {
  const { session, error } = await requireSession(['candidate']);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const minStipend = Number(searchParams.get('minStipend') || 0);
  const workMode = searchParams.get('workMode') || '';
  const minMatch = Number(searchParams.get('minMatch') || 0);
  const savedOnly = searchParams.get('savedOnly') === '1';
  const recommended = searchParams.get('recommended') === '1';

  const candResult = await query(`SELECT id, skills FROM ip_candidates WHERE user_id = $1`, [session.user.id]);
  const candidateId = candResult.rows[0]?.id;
  const skills = candResult.rows[0]?.skills || [];

  const where = [`i.status = 'published'`];
  const params = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`(lower(i.title) LIKE $${params.length} OR lower(e.company_name) LIKE $${params.length})`);
  }
  if (minStipend) {
    params.push(minStipend);
    where.push(`COALESCE(i.stipend_inr,0) >= $${params.length}`);
  }
  if (workMode) {
    params.push(workMode);
    where.push(`i.work_mode = $${params.length}`);
  }
  if (savedOnly && candidateId) {
    params.push(candidateId);
    where.push(`EXISTS (SELECT 1 FROM ip_saved_internships s WHERE s.internship_id = i.id AND s.candidate_id = $${params.length})`);
  }

  const result = await query(
    `SELECT i.*, e.company_name, e.logo_url, e.show_hiring_numbers, e.historical_hires
     FROM ip_internships i JOIN ip_employers e ON e.id = i.employer_id
     WHERE ${where.join(' AND ')}
     ORDER BY i.created_at DESC
     LIMIT 200`,
    params,
  );

  let savedIds = new Set();
  if (candidateId) {
    const saved = await query(`SELECT internship_id FROM ip_saved_internships WHERE candidate_id = $1`, [candidateId]);
    savedIds = new Set(saved.rows.map((r) => r.internship_id));
  }

  let items = result.rows.map((r) => ({
    ...r,
    company_name: r.show_employer_identity ? r.company_name : 'Confidential employer',
    match_score: matchScore(skills, r.eligibility),
    saved: savedIds.has(r.id),
  }));

  if (minMatch) items = items.filter((i) => i.match_score >= minMatch);
  if (recommended) items = items.sort((a, b) => b.match_score - a.match_score).slice(0, 12);

  return jsonOk({ items });
}
