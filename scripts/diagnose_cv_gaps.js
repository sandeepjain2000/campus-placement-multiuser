/* eslint-disable no-console */
const path = require('path');
const { Client } = require('pg');
const fs = require('fs');

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
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

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
const url = process.env.DATABASE_URL || env.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const r = await client.query(`
    SELECT sp.roll_number, u.email,
           (SELECT COUNT(*) FROM student_documents sd
            WHERE sd.student_id = sp.id AND LOWER(sd.document_type) = 'resume') AS resume_docs,
           (SELECT COUNT(*) FROM student_cvs sc
            WHERE sc.student_id = sp.id AND sc.archived_at IS NULL) AS active_cvs,
           CASE
             WHEN sp.resume_url IS NULL OR TRIM(sp.resume_url) = '' THEN 'empty'
             WHEN sp.resume_url ILIKE '%dummy.pdf%' THEN 'dummy'
             ELSE 'real'
           END AS profile_resume
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id
    WHERE u.role = 'student'
      AND sp.archived_at IS NULL
    ORDER BY active_cvs ASC, resume_docs DESC
    LIMIT 25
  `);
  console.table(r.rows);

  const bad = await client.query(`
    SELECT COUNT(*)::int AS n FROM student_profiles sp
    WHERE sp.archived_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM student_documents sd
          WHERE sd.student_id = sp.id AND LOWER(sd.document_type) = 'resume'
            AND sd.file_url NOT ILIKE '%dummy.pdf%'
        )
        OR (
          sp.resume_url IS NOT NULL AND TRIM(sp.resume_url) <> ''
          AND sp.resume_url NOT ILIKE '%dummy.pdf%'
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM student_cvs sc
        WHERE sc.student_id = sp.id AND sc.archived_at IS NULL
      )
  `);
  console.log('Students with resume data but ZERO active CVs:', bad.rows[0].n);

  const settings = await client.query(`
    SELECT name, settings->>'requireCvVerification' AS require_cv
    FROM tenants WHERE type = 'college' AND (settings->>'requireCvVerification')::boolean = true
  `);
  console.log('Colleges requiring CV verification:', settings.rows);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
