/**
 * Alias for college dashboard stats — same payload as GET /api/college/dashboard
 * (overview page uses /api/college/dashboard; this route satisfies tooling/tests that call /overview).
 */
export { GET } from '../dashboard/route';
