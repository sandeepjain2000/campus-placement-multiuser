/**
 * When true, the in-app guided test bar is compiled in (sandbox / local QA).
 * Hide globally: NEXT_PUBLIC_HIDE_GUIDED_RUNNER=true
 * Force on in prod: NEXT_PUBLIC_GUIDED_RUNNER=true
 */
export function isGuidedRunnerFeatureEnabled() {
  if (process.env.NEXT_PUBLIC_HIDE_GUIDED_RUNNER === 'true') return false;
  if (process.env.NEXT_PUBLIC_GUIDED_RUNNER === 'true') return true;
  if (process.env.NEXT_PUBLIC_GUIDED_RUNNER === 'false') return false;

  // Disable if explicitly running on Vercel deployment
  if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return false;
  }

  // Disable on any Vercel-hosted deployment (including custom domains).
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return false;

  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn.includes('vercel.app')) {
      return false;
    }
  }

  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.NEXT_PUBLIC_HIDE_SANDBOX_BANNER === 'true') return false;
  if (process.env.NEXT_PUBLIC_SANDBOX_BANNER === 'false') return false;
  return false;
}

export function isGuidedRunnerLoggingEnabled() {
  if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return false;
  }
  return process.env.LOG_GUIDED_RUNNER === 'true';
}
