/**
 * Inlined at build time from next.config.mjs (package.json + optional Vercel git SHA / deployment id).
 */
export function getAppVersionLabel() {
  const v = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
  const sha = process.env.NEXT_PUBLIC_APP_GIT_SHA || '';
  const dpl = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || '';
  if (sha) return `v${v} (${sha})`;
  if (dpl) return `v${v} · ${dpl}`;
  return `v${v}`;
}

/** Native tooltip + accessible name for the notifications control. */
export function getNotificationIconTitle() {
  return `${getAppVersionLabel()} — Notifications`;
}
