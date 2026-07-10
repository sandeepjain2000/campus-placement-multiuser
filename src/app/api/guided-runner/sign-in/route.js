import { NextResponse } from 'next/server';
import { isGuidedRunnerFeatureEnabled } from '@/lib/guidedRunnerConfig';
import { performGuidedTestSignIn } from '@/lib/guidedTestSignIn';
import { applySessionCookiePolicy } from '@/lib/sessionPolicy';
import { SESSION_COOKIE_NAME, sessionTokenCookieOptions } from '@/lib/sessionPolicy';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;
export const runtime = 'nodejs';

async function __platform_POST(request) {
  if (!isGuidedRunnerFeatureEnabled()) {
    return NextResponse.json({ ok: false, error: 'Guided testing API disabled in this environment.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await performGuidedTestSignIn(body?.email, body?.password);

    if (!result.ok) {
      return NextResponse.json(result, { status: 403 });
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: result.redirectTo,
      role: result.role,
      email: result.email,
    });
    response.cookies.set(SESSION_COOKIE_NAME, result.token, sessionTokenCookieOptions());
    return applySessionCookiePolicy(response);
  } catch (e) {
    console.error('POST /api/guided-runner/sign-in', e);
    return NextResponse.json({ ok: false, error: e.message || 'Guided sign-in failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_guided_runner_sign_in' });
export const POST = __platformApiHandlers.POST;
