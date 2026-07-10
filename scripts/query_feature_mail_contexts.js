/* eslint-disable no-console */
const { Client } = require('pg');
const fs = require('fs');

function readEnvLocal() {
  if (!fs.existsSync('.env.local')) return {};
  const out = {};
  for (const raw of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

(async () => {
  const env = readEnvLocal();
  const url = process.env.DATABASE_URL || env.DATABASE_URL;
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    `SELECT context, status, COUNT(*)::int AS n
     FROM mail_delivery_logs
     WHERE context IN ('college_bulk_student_notify', 'internship_ppo_confirmed', 'student_formal_offer')
        OR context LIKE '%ppo%'
     GROUP BY 1, 2`,
  );
  console.log('--- feature email contexts ---');
  console.log(JSON.stringify(r.rows, null, 2));

  try {
    const pe = await c.query(
      `SELECT created_at, context, LEFT(message, 200) AS message
       FROM platform_error_logs ORDER BY created_at DESC LIMIT 10`,
    );
    console.log('--- latest platform_error_logs ---');
    console.log(JSON.stringify(pe.rows, null, 2));
  } catch (e) {
    console.log('platform_error_logs:', e.message);
  }

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
