import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';

export async function GET() {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const result = await query(
    `SELECT d.*, e.company_name, e.work_email, e.approval_status
     FROM ip_employer_documents d
     JOIN ip_employers e ON e.id = d.employer_id
     ORDER BY d.created_at DESC LIMIT 200`,
  );
  return jsonOk({ items: result.rows });
}

export async function PATCH(request) {
  const { session, error } = await requireSession(['superadmin']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const id = String(body.id || '');
  const reviewStatus = String(body.reviewStatus || body.review_status || '');
  if (!id || !['approved', 'flagged', 'pending'].includes(reviewStatus)) {
    return jsonError('id and reviewStatus (approved|flagged|pending) required');
  }
  await query(
    `UPDATE ip_employer_documents
     SET review_status = $2, review_notes = $3, reviewed_at = now()
     WHERE id = $1`,
    [id, reviewStatus, body.notes || null],
  );
  return jsonOk({ ok: true, reviewedBy: session.user.id });
}
