import { NextResponse } from 'next/server';
import { showSandboxLoginBanner } from '@/lib/sandboxBanner';

/**
 * Demo data APIs: on in development, when DEMO_DATA_API_ENABLED=true,
 * or on public sandbox/demo deployments (same signal as the login banner).
 */
export function isDemoDataApiEnabled() {
  if (process.env.DEMO_DATA_API_ENABLED === 'true') return true;
  if (process.env.DEMO_DATA_API_ENABLED === 'false') return false;

  // Disable on production server/deployments unless explicitly forced true
  if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (showSandboxLoginBanner()) return true;
  return process.env.NODE_ENV !== 'production';
}

export function demoDataDisabledResponse() {
  return NextResponse.json(
    {
      error:
        'Demo data APIs are disabled in this environment. Set DEMO_DATA_API_ENABLED=true to enable in production.',
    },
    { status: 403 },
  );
}
