import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { resolveMenuHighlightForUser } from '@/lib/menuHighlight';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolved = await resolveMenuHighlightForUser(session.user);
  return NextResponse.json({
    active: resolved.active,
    color: resolved.color,
    itemKeys: resolved.itemKeys,
  });
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_menu_highlight' },
);
export const GET = __platformApiHandlers.GET;
