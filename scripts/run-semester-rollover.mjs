#!/usr/bin/env node
/**
 * Trigger semester rollover via the deployed API (May–June window unless --force).
 *
 * Usage:
 *   APP_URL=https://your-app.vercel.app CRON_SECRET=... node scripts/run-semester-rollover.mjs
 *   node scripts/run-semester-rollover.mjs --force
 *   node scripts/run-semester-rollover.mjs --dry-run --force
 *   node scripts/run-semester-rollover.mjs --tenant <uuid> --force
 */
const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const tenantIdx = args.indexOf('--tenant');
const tenantId = tenantIdx >= 0 ? args[tenantIdx + 1] : null;

const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const secret = process.env.CRON_SECRET || process.env.SEMESTER_ROLLOVER_CRON_SECRET || '';

async function main() {
  const res = await fetch(`${baseUrl}/api/cron/semester-rollover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ force, dryRun, tenantId }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(json?.error || res.statusText);
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
