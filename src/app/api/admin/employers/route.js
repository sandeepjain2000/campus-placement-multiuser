import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT
        ep.id,
        ep.company_name,
        ep.website,
        ep.industry,
        ep.total_hires,
        ep.is_verified,
        ep.is_blacklisted,
        u.is_active AS account_active
      FROM employer_profiles ep
      INNER JOIN users u ON u.id = ep.user_id
      ORDER BY ep.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const rows = result?.rows || [];
    return NextResponse.json({
      employers: rows.map((r) => ({
        id: r.id,
        name: r.company_name,
        website: r.website || null,
        industry: r.industry || '—',
        hires: Number(r.total_hires || 0),
        verified: Boolean(r.is_verified),
        blacklisted: Boolean(r.is_blacklisted),
        active: Boolean(r.account_active),
      })),
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to load admin employers:', error.message);
    return NextResponse.json({ error: 'Failed to load employers' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_employers' });
export const GET = __platformApiHandlers.GET;
