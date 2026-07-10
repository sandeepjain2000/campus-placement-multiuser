/* eslint-disable no-console */
/**
 * Soft-delete all purge-eligible internships, short projects, and hackathons.
 * Mirrors eligibility in src/lib/demoPurgeFactory.js
 */
const fs = require('fs');
const { Client } = require('pg');

const SEED_LOOP_DESCRIPTIONS = [
  'Summer internship program.',
  'Short project opportunity.',
  'Full time software engineer role.',
];
const ANALYTICS_TEST_DESCRIPTIONS = [
  'Completed internship listing for analytics tests.',
  'Completed drive record for analytics testing.',
];

const ELIGIBLE_WHERE = `
  COALESCE(jp.is_deleted, false) = false
  AND jp.job_type IN ('internship', 'short_project', 'hackathon')
  AND (
    jp.description ILIKE '%Data Tester API%'
    OR jp.title ILIKE 'GT-%'
    OR jp.description ~* '^Duration:\\s*\\d+\\s+months\\.'
    OR jp.id::text LIKE 'd1000000-%'
    OR jp.description = ANY($1::text[])
    OR jp.description ILIKE '%Job description (auto-generated from title%'
    OR jp.description = ANY($2::text[])
  )
`;

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    const jobs = await client.query(
      `SELECT jp.id, jp.title, jp.job_type FROM job_postings jp WHERE ${ELIGIBLE_WHERE}`,
      [SEED_LOOP_DESCRIPTIONS, ANALYTICS_TEST_DESCRIPTIONS],
    );
    const jobIds = jobs.rows.map((r) => r.id);
    console.log(`Purging ${jobIds.length} program listing(s)...`);

    if (!jobIds.length) {
      await client.query('ROLLBACK');
      console.log('Nothing to purge.');
      return;
    }

    const drives = await client.query(
      `SELECT id FROM placement_drives
       WHERE job_id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false`,
      [jobIds],
    );
    const driveIds = drives.rows.map((r) => r.id);

    const progApps = await client.query(
      `UPDATE program_applications
       SET is_deleted = true, updated_at = NOW()
       WHERE job_id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false
       RETURNING id`,
      [jobIds],
    );

    let driveApps = { rowCount: 0 };
    let offers = { rowCount: 0 };
    let assessments = { rowCount: 0 };
    let drivesDeleted = { rowCount: 0 };

    if (driveIds.length) {
      drivesDeleted = await client.query(
        `UPDATE placement_drives
         SET is_deleted = true, updated_at = NOW()
         WHERE job_id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false`,
        [jobIds],
      );
      driveApps = await client.query(
        `UPDATE applications
         SET is_deleted = true, updated_at = NOW()
         WHERE (drive_id = ANY($1::uuid[]) OR job_id = ANY($2::uuid[]))
           AND COALESCE(is_deleted, false) = false`,
        [driveIds, jobIds],
      );
      offers = await client.query(
        `UPDATE offers
         SET is_deleted = true, updated_at = NOW()
         WHERE drive_id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false`,
        [driveIds],
      );
      assessments = await client.query(
        `UPDATE employer_assessment_uploads
         SET is_deleted = true
         WHERE drive_id = ANY($1::uuid[]) OR job_id = ANY($2::uuid[])`,
        [driveIds, jobIds],
      );
    } else {
      driveApps = await client.query(
        `UPDATE applications
         SET is_deleted = true, updated_at = NOW()
         WHERE job_id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false`,
        [jobIds],
      );
      assessments = await client.query(
        `UPDATE employer_assessment_uploads
         SET is_deleted = true
         WHERE job_id = ANY($1::uuid[])`,
        [jobIds],
      );
    }

    const jobsDeleted = await client.query(
      `UPDATE job_postings
       SET is_deleted = true, updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND COALESCE(is_deleted, false) = false`,
      [jobIds],
    );

    await client.query('COMMIT');

    console.log('Done.');
    console.log({
      jobs: jobsDeleted.rowCount,
      programApplications: progApps.rowCount,
      drives: drivesDeleted.rowCount,
      driveApplications: driveApps.rowCount,
      offers: offers.rowCount,
      assessments: assessments.rowCount,
    });
    for (const row of jobs.rows) {
      console.log(`  - ${row.job_type}: ${row.title}`);
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
