import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildScreenRegistry, filterScreensForRole } from '@/config/screenRegistry';

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const role = session.user.role;
    if (q.trim()) {
      return NextResponse.json({ role, screens: filterScreensForRole(role, q, 40) });
    }
    const all = buildScreenRegistry().filter((s) => s.roles.includes(role));
    return NextResponse.json({ role, screens: all });
  } catch (e) {
    console.error('GET /api/screens/registry', e);
    return NextResponse.json({ error: 'Failed to load screens' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_screens_registry' });
export const GET = __platformApiHandlers.GET;
