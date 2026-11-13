/**
 * Public /api/debug/* ingest (login-log, client log).
 * Off in production builds unless DEBUG_INGEST_ENABLED=true.
 * Local `npm run dev` stays on (NODE_ENV !== 'production').
 */
export function isDebugIngestEnabled() {
  if (process.env.DEBUG_INGEST_ENABLED === 'true') return true;
  if (process.env.DEBUG_INGEST_ENABLED === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
