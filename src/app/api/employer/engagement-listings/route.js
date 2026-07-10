import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerUserId = session.user.id;

    let rows;
    try {
      const r = await query(
        `SELECT
           cel.id,
           cel.kind,
           cel.title,
           cel.summary,
           cel.requirements,
           cel.time_hint,
           cel.created_at,
           t.id AS college_id,
           t.name AS college_name,
           t.city AS college_city,
           t.state AS college_state,
           COALESCE(NULLIF(TRIM(t.communication_email), ''), t.email) AS college_email,
           cgs.sent_at AS confirmation_sent_at
         FROM campus_engagement_listings cel
         INNER JOIN tenants t ON t.id = cel.tenant_id
         LEFT JOIN campus_guest_confirmation_sends cgs
           ON cgs.listing_id = cel.id AND cgs.employer_user_id = $1::uuid
         WHERE cel.status = 'published'
         ORDER BY cel.created_at DESC`,
        [employerUserId],
      );
      rows = r.rows;
    } catch (e) {
      if (e.code !== '42P01') throw e;
      const r = await query(
        `SELECT
           cel.id,
           cel.kind,
           cel.title,
           cel.summary,
           cel.requirements,
           cel.time_hint,
           cel.created_at,
           t.id AS college_id,
           t.name AS college_name,
           t.city AS college_city,
           t.state AS college_state,
           COALESCE(NULLIF(TRIM(t.communication_email), ''), t.email) AS college_email
         FROM campus_engagement_listings cel
         INNER JOIN tenants t ON t.id = cel.tenant_id
         WHERE cel.status = 'published'
         ORDER BY cel.created_at DESC`,
      );
      rows = r.rows.map((row) => ({ ...row, confirmation_sent_at: null }));
    }

    return NextResponse.json({
      listings: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        summary: row.summary,
        requirements: row.requirements,
        timeHint: row.time_hint,
        createdAt: row.created_at,
        college: {
          id: row.college_id,
          name: row.college_name,
          city: row.college_city,
          state: row.college_state,
        },
        canConfirm: Boolean(String(row.college_email || '').trim()),
        confirmationSentAt: row.confirmation_sent_at,
      })),
    });
  } catch (e) {
    console.error('GET /api/employer/engagement-listings', e);
    return NextResponse.json({ error: 'Failed to load campus needs' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_engagement_listings' });
export const GET = __platformApiHandlers.GET;
