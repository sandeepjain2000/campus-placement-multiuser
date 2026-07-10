/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = readEnvLocal();
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const checks = await client.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'employer_assessment_rows' AND column_name = 'hiring_result'
       ) AS hiring_result_col,
       to_regclass('public.employer_assessment_contexts') IS NOT NULL AS contexts_table,
       to_regclass('public.employer_assessment_import_sessions') IS NOT NULL AS import_sessions_table,
       to_regclass('public.employer_assessment_import_staging_rows') IS NOT NULL AS import_staging_table`,
  );
  await client.end();
  const row = checks.rows[0] || {};
  console.log('hiring_result column:', row.hiring_result_col ? 'OK' : 'MISSING');
  console.log('employer_assessment_contexts:', row.contexts_table ? 'OK' : 'MISSING');
  console.log('employer_assessment_import_sessions:', row.import_sessions_table ? 'OK' : 'MISSING');
  console.log('employer_assessment_import_staging_rows:', row.import_staging_table ? 'OK' : 'MISSING');
  if (!row.hiring_result_col || !row.import_sessions_table || !row.import_staging_table) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
