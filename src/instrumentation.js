/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DO NOT import pg, db.js, or platformErrorLog.js in this file.     ║
 * ║                                                                     ║
 * ║  instrumentation.js is compiled for BOTH Node.js and Edge runtimes. ║
 * ║  Importing Node-only modules (pg, fs, path) breaks the Edge build.  ║
 * ║  API error logging is handled per-route via withApiHandlers.        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { assertNextAuthSecretIfProduction } = await import('./lib/assertAuthEnv.js');
  assertNextAuthSecretIfProduction();
}
