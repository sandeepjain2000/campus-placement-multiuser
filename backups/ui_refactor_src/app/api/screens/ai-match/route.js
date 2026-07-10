import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildScreenRegistry } from '@/config/screenRegistry';
import { matchScreensWithOpenAI } from '@/lib/screenSearchOpenai';

export async function POST(request) {
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
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      openaiHttpStatus,
    });
  } catch (e) {
    console.error('POST /api/screens/ai-match', e);
    return NextResponse.json({ error: 'AI match failed' }, { status: 500 });
  }
}
