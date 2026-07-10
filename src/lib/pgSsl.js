import fs from 'fs';

let warnedInsecureTls;

/**
 * PostgreSQL SSL options for `pg` Pool / Client.
 * - Local hosts: TLS off (typical Docker / dev Postgres without SSL).
 * - Remote: verify server cert by default (mitigates MITM).
 * - Opt out: DATABASE_SSL_REJECT_UNAUTHORIZED=false or DB_SSL_REJECT_UNAUTHORIZED=false
 *   disables verification in any NODE_ENV (logs one warning outside development/test/local).
 *   Prefer DATABASE_SSL_CA or NODE_EXTRA_CA_CERTS when you have the issuing CA.
 * - Optional CA bundle: DATABASE_SSL_CA=/path/to/ca.pem
 *
 * @param {string} [hostname]
 * @returns {false | import('pg').ConnectionConfig['ssl']}
 */
export function getPgSslOption(hostname) {
  const h = String(hostname || '').toLowerCase();
  const local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
  if (local) return false;

  const insecureEnv =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ||
    process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false';
  const devLike = ['development', 'test', 'local'].includes(
    (process.env.NODE_ENV || '').toLowerCase(),
  );

  if (insecureEnv) {
    if (!devLike && !warnedInsecureTls) {
      warnedInsecureTls = true;
      console.warn(
        '[pgSsl] TLS verification disabled for PostgreSQL (DATABASE_SSL_REJECT_UNAUTHORIZED=false). Prefer DATABASE_SSL_CA or NODE_EXTRA_CA_CERTS in production.',
      );
    }
    return { rejectUnauthorized: false };
  }

  /** @type {Exclude<import('pg').ConnectionConfig['ssl'], boolean | undefined>} */
  const ssl = { rejectUnauthorized: true };
  const caPath = process.env.DATABASE_SSL_CA?.trim();
  if (caPath) {
    try {
      ssl.ca = fs.readFileSync(caPath, 'utf8');
    } catch (e) {
      throw new Error(`DATABASE_SSL_CA: cannot read ${caPath}: ${e.message}`);
    }
  }
  return ssl;
}
