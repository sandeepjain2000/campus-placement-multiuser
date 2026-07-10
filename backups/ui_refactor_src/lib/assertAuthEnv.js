/** Minimum length for NEXTAUTH_SECRET in production (entropy baseline). */
const MIN_SECRET_LEN = 32;

function isNextBuildProcess() {
  return (
    process.env.npm_lifecycle_event === 'build' ||
    (Array.isArray(process.argv) && process.argv.includes('build'))
  );
}

function isProductionDeploy() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  );
}

/**
 * Fail fast when production would run with a missing or weak NEXTAUTH_SECRET.
 * Skips during `next build` so CI can compile without runtime secrets in some setups.
 */
export function assertNextAuthSecretIfProduction() {
  if (isNextBuildProcess()) return;
  if (!isProductionDeploy()) return;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || String(secret).length < MIN_SECRET_LEN) {
    throw new Error(
      `NEXTAUTH_SECRET must be set to a random value of at least ${MIN_SECRET_LEN} characters in production (JWT signing).`,
    );
  }
}
