const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('../lib/repo-root');

const root = REPO_ROOT;
const envPath = path.join(root, '.env.local');

function readEnvLocal() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

const env = readEnvLocal();
const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  env.SUPABASE_DATABASE_URL ||
  env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DATABASE_URL is required.');
  process.exit(1);
}

let warnedInsecureTls;
function pgSslOption(hostname) {
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
  const ssl = { rejectUnauthorized: true };
  const caPath = process.env.DATABASE_SSL_CA?.trim();
  if (caPath) {
    try {
      ssl.ca = fs.readFileSync(caPath, 'utf8');
    } catch (e) {
      console.error(`DATABASE_SSL_CA: cannot read ${caPath}:`, e.message);
      process.exit(1);
    }
  }
  return ssl;
}

const hostHint = (() => {
  const m = String(connectionString).match(/@([^/?:]+)/);
  return m ? m[1] : '';
})();

const pool = new Pool({
  connectionString,
  ssl: pgSslOption(hostHint),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 5000,
});

async function runSQL() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run destructive schema reset in production.');
  }
  if (!process.argv.includes('--confirm-destructive')) {
    throw new Error('Pass --confirm-destructive to confirm schema reset.');
  }

  const schemaPath = path.join(root, 'db', 'schema.sql');
  const seedPath = path.join(root, 'db', 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    throw new Error('db/schema.sql or db/seed.sql not found.');
  }

  const client = await pool.connect();
  try {
    console.log('Connecting to database...');

    // Drop all existing tables by recreating the public schema safely
    console.log('Dropping existing data...');
    await client.query('BEGIN');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');

    console.log('Running schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);

    console.log('Running seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);

    await client.query('COMMIT');

    console.log('Database schema and seed executed successfully!');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
    console.error('Error running SQL:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    if (err.stack) console.error(err.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSQL().catch((err) => {
  console.error('Unhandled error:', err.message || err);
  process.exit(1);
});
