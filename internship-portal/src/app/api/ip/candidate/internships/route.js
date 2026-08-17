import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';
import { computeValidationScore } from '@/lib/internshipValidationScore';
import { skillMatchPercent } from '@/lib/skillMatch';

export async function GET(request) {
  const { session, error } = await requireSession(['candidate']);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const minStipend = Number(searchParams.get('minStipend') || 0);
  const workMode = searchParams.get('workMode') || '';
  const minMatch = Number(searchParams.get('minMatch') || 0);
  const minValidation = Number(searchParams.get('minValidation') || 0);
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
    `SELECT i.*,
            e.id as employer_row_id,
            e.company_name,
            e.logo_url,
            e.show_hiring_numbers,
            e.historical_hires,
            e.approval_status,
            e.work_email,
            e.website,
            e.linkedin_url,
            e.ethics_acks,
            e.ethics_accepted_at,
            e.updated_at as employer_updated_at
     FROM ip_internships i
     JOIN ip_employers e ON e.id = i.employer_id
     WHERE ${where.join(' AND ')}
     ORDER BY i.created_at DESC
     LIMIT 200`,
    params,
  );

  const employerIds = [...new Set(result.rows.map((r) => r.employer_id).filter(Boolean))];
  const docsByEmployer = new Map();
  if (employerIds.length) {
    const docs = await query(
      `SELECT id, employer_id, doc_type, review_status, reviewed_at, created_at
       FROM ip_employer_documents
       WHERE employer_id = ANY($1::text[])`,
      [employerIds],
    );
    for (const row of docs.rows) {
      const list = docsByEmployer.get(row.employer_id) || [];
      list.push(row);
      docsByEmployer.set(row.employer_id, list);
    }
  }

  let savedIds = new Set();
  if (candidateId) {
    const saved = await query(`SELECT internship_id FROM ip_saved_internships WHERE candidate_id = $1`, [candidateId]);
    savedIds = new Set(saved.rows.map((r) => r.internship_id));
  }

  let items = result.rows.map((r) => {
    const validation = computeValidationScore({
      employer: {
        approval_status: r.approval_status,
        work_email: r.work_email,
        website: r.website,
        linkedin_url: r.linkedin_url,
        ethics_acks: r.ethics_acks,
        ethics_accepted_at: r.ethics_accepted_at,
        updated_at: r.employer_updated_at,
      },
      documents: docsByEmployer.get(r.employer_id) || [],
      internship: r,
    });
    return {
      ...r,
      company_name: r.show_employer_identity ? r.company_name : 'Confidential employer',
      match_score: skillMatchPercent(skills, r.eligibility),
      saved: savedIds.has(r.id),
      validation_score: validation.validation_score,
      validation_label: validation.validation_label,
      validation_breakdown: validation.validation_breakdown,
    };
  });

  if (minMatch) items = items.filter((i) => i.match_score >= minMatch);
  if (minValidation) items = items.filter((i) => i.validation_score >= minValidation);
  if (recommended) items = items.sort((a, b) => b.match_score - a.match_score).slice(0, 12);

  return jsonOk({ items });
}
