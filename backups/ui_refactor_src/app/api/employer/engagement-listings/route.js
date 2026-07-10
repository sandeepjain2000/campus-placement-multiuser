import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
         t.state AS college_state
       FROM campus_engagement_listings cel
       INNER JOIN tenants t ON t.id = cel.tenant_id
       WHERE cel.status = 'published'
       ORDER BY cel.created_at DESC`
    );

    return NextResponse.json({
      listings: r.rows.map((row) => ({
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
      })),
    });
  } catch (e) {
    console.error('GET /api/employer/engagement-listings', e);
    return NextResponse.json({ error: 'Failed to load campus needs' }, { status: 500 });
  }
}
