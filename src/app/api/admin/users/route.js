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
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active
       FROM users
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      users: result.rows.map((r) => ({
        id: r.id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        email: r.email,
        role: r.role,
        active: Boolean(r.is_active),
      })),
    });
  } catch (error) {
    console.error('Failed to load admin users:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_users' });
export const GET = __platformApiHandlers.GET;
