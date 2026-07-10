const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found at', envPath);
  process.exit(1);
}
const raw = fs.readFileSync(envPath, 'utf8');
let databaseUrl = null;
let supabaseUrl = null;
for (const line of raw.split(/\r?\n/)) {
  let m = line.match(/^SUPABASE_DATABASE_URL=(.+)$/);
  if (m) supabaseUrl = m[1].trim().replace(/^["']|["']$/g, '');
  m = line.match(/^DATABASE_URL=(.+)$/);
  if (m) databaseUrl = m[1].trim().replace(/^["']|["']$/g, '');
}

// Prefer explicit Supabase URL when both exist (e.g. local DB + cloud).
const url = supabaseUrl || databaseUrl || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.error('Set SUPABASE_DATABASE_URL or DATABASE_URL in .env.local (or environment).');
  process.exit(1);
}

if (supabaseUrl && databaseUrl && supabaseUrl !== databaseUrl) {
  console.log('Using SUPABASE_DATABASE_URL (Supabase).');
} else if (String(url).includes('supabase')) {
  console.log('Using Supabase connection string.');
}

const sqlPath = path.join(root, 'db', 'migrations', '002_platform_feedback.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Migration file not found:', sqlPath);
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
  const allowedEnvs = ['development', 'test', 'local'];
  const currentEnv = (process.env.NODE_ENV || '').toLowerCase();
  if (!allowedEnvs.includes(currentEnv)) {
    throw new Error(
      `Refusing to run migration. NODE_ENV must be one of ${allowedEnvs.join(', ')}. Current: ${process.env.NODE_ENV || '(unset)'}`
    );
  }
  if (!process.argv.includes('--confirm-migration')) {
    throw new Error('Pass --confirm-migration to apply SQL migration.');
  }

  const hostHint = (() => {
    const m = String(url).match(/@([^/?:]+)/);
    return m ? m[1] : '';
  })();
  const h = hostHint.toLowerCase();
  const local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
  let ssl = false;
  if (!local) {
    const insecureEnv =
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ||
      process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false';
    const insecureAllowedEnv = ['development', 'test', 'local'].includes(currentEnv);
    if (insecureEnv && insecureAllowedEnv) {
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = { rejectUnauthorized: true };
      const caPath = process.env.DATABASE_SSL_CA?.trim();
      if (caPath) ssl.ca = fs.readFileSync(caPath, 'utf8');
    }
  }

  const client = new Client({
    connectionString: url,
    ssl,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Applied:', sqlPath);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
