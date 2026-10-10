const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

const env = readEnvLocal();
const client = new Client({ connectionString: env.DATABASE_URL || env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(() => {
  return client.query(`SELECT pa.id as application_id, sp.user_id, pa.status, jp.job_type
FROM program_applications pa
JOIN student_profiles sp ON pa.student_id = sp.id
LIMIT 5`);
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
