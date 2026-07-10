import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildScreenRegistry } from '@/config/screenRegistry';
import { isLlmChatConfigured } from '@/lib/llmChatConfig';
import { matchScreensWithOpenAI } from '@/lib/screenSearchOpenai';

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const q = String(body?.q || '').trim();
    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    const role = session.user.role;
    const all = buildScreenRegistry().filter((s) => s.roles.includes(role));
    const { hrefs, openaiHttpStatus } = await matchScreensWithOpenAI(
      q,
      all.map((s) => ({ href: s.href, label: s.label, section: s.section })),
    );

    const byHref = new Map(all.map((s) => [s.href, s]));
    const matches = hrefs.map((h) => byHref.get(h)).filter(Boolean);

    return NextResponse.json({
      query: q,
      matches,
      openaiConfigured: isLlmChatConfigured(),
      llmConfigured: isLlmChatConfigured(),
      openaiHttpStatus,
    });
  } catch (e) {
    console.error('POST /api/screens/ai-match', e);
    return NextResponse.json({ error: 'AI match failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_screens_ai_match' });
export const POST = __platformApiHandlers.POST;
