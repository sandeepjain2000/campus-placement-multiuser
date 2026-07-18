import { showSandboxLoginBanner } from '@/lib/sandboxBanner';

/**
 * Thin site-wide notice that this deploy is a sandbox (not production).
 * Hidden when NEXT_PUBLIC_HIDE_SANDBOX_BANNER or NEXT_PUBLIC_SANDBOX_BANNER=false.
 */
export default function SandboxEnvironmentBanner() {
  if (!showSandboxLoginBanner()) return null;

  return (
    <div className="sandbox-env-banner" role="status">
      Sandbox environment — for demonstration and testing only. Not production.
    </div>
  );
}
