import { query } from '@/lib/db';
import { requireSession, jsonOk } from '@/lib/apiAuth';

export async function GET() {
  const { error } = await requireSession(['superadmin']);
  if (error) return error;
  const [candidates, employers, pendingEmployers, internships, applications, offers, requests, ideas] = await Promise.all([
    query(`SELECT count(*) FROM ip_users WHERE role = 'candidate'`),
    query(`SELECT count(*) FROM ip_users WHERE role = 'employer'`),
    query(`SELECT count(*) FROM ip_employers WHERE approval_status = 'pending'`),
    query(`SELECT count(*) FILTER (WHERE status='published') as live, count(*) as total FROM ip_internships`),
    query(`SELECT count(*) FROM ip_applications`),
    query(`SELECT count(*) FILTER (WHERE status='accepted') as accepted, count(*) as total FROM ip_offers`),
    query(`SELECT count(*) FROM ip_employer_requests WHERE status = 'pending'`),
    query(`SELECT count(*) FROM ip_feature_ideas WHERE status = 'Pending approval'`),
  ]);
  return jsonOk({
    candidates: Number(candidates.rows[0].count),
    employers: Number(employers.rows[0].count),
    pendingEmployers: Number(pendingEmployers.rows[0].count),
    internships: internships.rows[0],
    applications: Number(applications.rows[0].count),
    offers: offers.rows[0],
    pendingRequests: Number(requests.rows[0].count),
    pendingIdeas: Number(ideas.rows[0].count),
  });
}
