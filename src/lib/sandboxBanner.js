/**
 * Login / public sandbox notice. Set NEXT_PUBLIC_HIDE_SANDBOX_BANNER=true to hide.
 * Set NEXT_PUBLIC_SANDBOX_BANNER=false to hide; any other value (or unset) shows the banner.
 */
export function showSandboxLoginBanner() {
  if (process.env.NEXT_PUBLIC_HIDE_SANDBOX_BANNER === 'true') return false;
  if (process.env.NEXT_PUBLIC_SANDBOX_BANNER === 'false') return false;
  return true;
}
