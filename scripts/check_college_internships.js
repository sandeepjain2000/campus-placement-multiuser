/* eslint-disable no-console */
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const r = await client.query(`
    SELECT jp.id, jp.title, jp.job_type,
           ep.company_name,
           jpv.college_status,
           (
             jp.description ILIKE '%Data Tester API%'
             OR jp.title ILIKE 'GT-%'
             OR jp.description ~* '^Duration:\\s*\\d+\\s+months\\.'
             OR jp.id::text LIKE 'd1000000-%'
             OR jp.description = ANY(ARRAY[
               'Summer internship program.',
               'Short project opportunity.',
               'Full time software engineer role.',
               'Completed internship listing for analytics tests.',
               'Completed drive record for analytics testing.'
             ])
             OR jp.description ILIKE '%Job description (auto-generated from title%'
           ) AS purge_eligible
    FROM job_postings jp
    JOIN employer_profiles ep ON ep.id = jp.employer_id
    JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
    WHERE jp.job_type IN ('internship', 'short_project', 'hackathon')
      AND jp.status = 'published'
      AND COALESCE(jp.is_deleted, false) = false
    ORDER BY ep.company_name, jp.job_type, jp.title
  `);

  console.log('Active published program listings (all campuses):', r.rowCount);
  for (const row of r.rows) {
    console.log(
      row.purge_eligible ? '[purge OK]' : '[NOT purgeable]',
      row.company_name,
      '|',
      row.job_type,
      '|',
      row.title,
      '|',
      row.college_status,
    );
  }

  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
