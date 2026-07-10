#!/usr/bin/env node
/**
 * Soft-delete all internships, jobs (sandbox types), and placement drives for a clean QA view.
 *
 *   npm run qa:purge:internships-drives
 *
 * Uses POST /api/demo/purge-all-jobs-internships when dev server is up,
 * then removes any remaining non-deleted placement_drives via DB.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

function databaseUrl() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  return process.env.DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
}

async function purgeViaApi(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/demo/purge-all-jobs-internships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 403) {
    throw new Error(json.error || 'Demo purge API disabled — run locally with npm run dev');
  }
  if (!res.ok && !json.ok) {
    throw new Error(json.error || `Purge API failed (${res.status})`);
  }
  return json;
}

async function purgeRemainingDrives(client) {
  const progApps = await client.query(
    `UPDATE program_applications SET is_deleted = true, updated_at = NOW()
     WHERE COALESCE(is_deleted, false) = false
       AND job_id IN (
         SELECT id FROM job_postings
         WHERE COALESCE(is_deleted, false) = false
           AND job_type = ANY('{internship,short_project,hackathon,full_time,part_time}'::text[])
       )`,
  );
  const jobs = await client.query(
    `UPDATE job_postings SET is_deleted = true, updated_at = NOW()
     WHERE COALESCE(is_deleted, false) = false
       AND job_type = ANY('{internship,short_project,hackathon,full_time,part_time}'::text[])`,
  );
  const apps = await client.query(
    `UPDATE applications SET is_deleted = true, updated_at = NOW()
     WHERE COALESCE(is_deleted, false) = false
       AND drive_id IN (SELECT id FROM placement_drives WHERE COALESCE(is_deleted, false) = false)`,
  );
  const drives = await client.query(
    `UPDATE placement_drives SET is_deleted = true, updated_at = NOW()
     WHERE COALESCE(is_deleted, false) = false`,
  );
  return {
    jobs: jobs.rowCount || 0,
    programApplications: progApps.rowCount || 0,
    drives: drives.rowCount || 0,
    applications: apps.rowCount || 0,
  };
}

async function countActive(client) {
  const jobs = await client.query(
    `SELECT COUNT(*)::int AS n FROM job_postings
     WHERE COALESCE(is_deleted, false) = false
       AND job_type = ANY('{internship,short_project,hackathon,full_time,part_time}'::text[])`,
  );
  const drives = await client.query(
    `SELECT COUNT(*)::int AS n FROM placement_drives WHERE COALESCE(is_deleted, false) = false`,
  );
  return { jobs: jobs.rows[0]?.n ?? 0, drives: drives.rows[0]?.n ?? 0 };
}

async function main() {
  const baseUrl = process.env.BASE_URL || process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
  const dbUrl = databaseUrl();
  if (!dbUrl) {
    console.error('DATABASE_URL not set (.env.local)');
    process.exit(1);
  }

  console.log('\n▶ Purge internships & drives for clean QA view\n');

  try {
    const apiResult = await purgeViaApi(baseUrl);
    console.log('  API purge-all-jobs-internships:', apiResult.message || JSON.stringify(apiResult.summary || apiResult));
  } catch (e) {
    console.warn(`  API purge skipped: ${e.message}`);
    console.warn('  (Start npm run dev, or rely on DB-only cleanup below.)\n');
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const before = await countActive(client);
    console.log(`  Before DB cleanup: ${before.jobs} job/internship postings, ${before.drives} drives`);

    const extra = await purgeRemainingDrives(client);
    console.log(
      `  DB cleanup: ${extra.jobs} jobs/internships, ${extra.drives} drives, ${extra.programApplications} program apps, ${extra.applications} drive apps`,
    );

    const after = await countActive(client);
    console.log(`  After: ${after.jobs} job/internship postings, ${after.drives} drives\n`);

    if (after.jobs > 0 || after.drives > 0) {
      console.warn('  Some rows remain (may need migration 066 is_deleted columns or manual review).\n');
    } else {
      console.log('✓ Internships and drives cleared.\n');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
