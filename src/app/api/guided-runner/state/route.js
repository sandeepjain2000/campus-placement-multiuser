import { NextResponse } from 'next/server';
import { isGuidedRunnerFeatureEnabled } from '@/lib/guidedRunnerConfig';
import { getGuidedState, getRecentGuidedLogs } from '@/lib/guidedRunnerDb';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;
export const runtime = 'nodejs';

function disabled() {
  return NextResponse.json({ error: 'Guided testing API disabled in this environment.' }, { status: 403 });
}

async function __platform_GET(request) {
  if (!isGuidedRunnerFeatureEnabled()) return disabled();
  try {
    const url = new URL(request.url);
    const includeLog = url.searchParams.get('log') === '1';
    const payload = getGuidedState();
    if (includeLog) {
      payload.recentLog = getRecentGuidedLogs(40);
    }
    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    console.error('GET /api/guided-runner/state', e);
    return NextResponse.json({ ok: false, error: e.message || 'Failed to read guided state' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_guided_runner_state' });
export const GET = __platformApiHandlers.GET;
