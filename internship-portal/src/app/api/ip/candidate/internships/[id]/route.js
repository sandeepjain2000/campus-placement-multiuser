import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const { error } = await requireSession(['candidate']);
  if (error) return error;
  const { id } = await params;
  const result = await query(
    `SELECT i.*, e.company_name, e.logo_url, e.about, e.website, e.show_hiring_numbers, e.historical_hires
     FROM ip_internships i JOIN ip_employers e ON e.id = i.employer_id
     WHERE i.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return jsonError('Not found', 404);
  if (!row.show_employer_identity) row.company_name = 'Confidential employer';
  return jsonOk({ internship: row });
}
