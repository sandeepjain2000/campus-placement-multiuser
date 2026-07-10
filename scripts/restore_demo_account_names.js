/* eslint-disable no-console */
/**
 * Verify and restore demo login account names from seed definitions.
 * Usage: node scripts/restore_demo_account_names.js
 *        node scripts/restore_demo_account_names.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/** @type {Record<string, { firstName: string, lastName: string | null, phone?: string | null }>} */
const EXPECTED_BY_EMAIL = {
  // Students (login picker)
  'arjun.verma@iitm.edu': { firstName: 'Arjun', lastName: 'Verma', phone: '+919800100001' },
  'sneha.rao@nitt.edu': { firstName: 'Sneha', lastName: 'Rao', phone: '+919800100015' },
  'rohan.mehta@bits.edu': { firstName: 'Rohan', lastName: 'Mehta', phone: '+919800100016' },
  'priya.sharma.alumni@iitm.edu': { firstName: 'Priya', lastName: 'Sharma', phone: '+919800100099' },
  // Employers
  'hr@techcorp.com': { firstName: 'Anita', lastName: 'Desai' },
  'hr@globalsoft.com': { firstName: 'Vikram', lastName: 'Singh' },
  'hr@infosys.com': { firstName: 'Meera', lastName: 'Nair' },
  'talent@innoventlabs.ai': { firstName: 'Rahul', lastName: 'Menon' },
  'careers@finedge.io': { firstName: 'Aditi', lastName: 'Kapoor' },
  // College admins
  'admin@iitm.edu': { firstName: 'Rajesh', lastName: 'Kumar' },
  'admin@nitt.edu': { firstName: 'Priya', lastName: 'Sharma' },
  'admin@bits.edu': { firstName: 'Suresh', lastName: 'Rao' },
  // Platform
  'admin@placementhub.com': { firstName: 'Platform', lastName: 'Admin' },
};

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

function namesFromEmail(email) {
  const local = String(email || '').split('@')[0] || '';
  if (!local.includes('.')) return null;
  const parts = local.split('.').filter(Boolean);
  if (parts.length < 2) return null;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return {
    firstName: cap(parts[0]),
    lastName: parts.slice(1).map(cap).join(' '),
  };
}

function norm(v) {
  return String(v || '').trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = readEnvLocal();
  const connectionString =
    process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL required');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const emails = Object.keys(EXPECTED_BY_EMAIL);
    const { rows } = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.updated_at
       FROM users u
       WHERE LOWER(u.email) = ANY($1::text[])`,
      [emails],
    );

    const byEmail = new Map(rows.map((r) => [norm(r.email).toLowerCase(), r]));
    const mismatches = [];
    const missing = [];

    for (const [email, expected] of Object.entries(EXPECTED_BY_EMAIL)) {
      const row = byEmail.get(email.toLowerCase());
      if (!row) {
        missing.push(email);
        continue;
      }
      const firstOk = norm(row.first_name) === expected.firstName;
      const lastOk = norm(row.last_name || '') === norm(expected.lastName || '');
      const phoneOk = expected.phone == null || norm(row.phone) === expected.phone;
      if (!firstOk || !lastOk || !phoneOk) {
        mismatches.push({
          email,
          id: row.id,
          role: row.role,
          was: {
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone,
            updated_at: row.updated_at,
          },
          expected,
        });
      }
    }

    console.log(`Checked ${emails.length} demo accounts. Found in DB: ${rows.length}.`);
    if (missing.length) {
      console.log('Missing accounts:', missing.join(', '));
    }

    if (!mismatches.length) {
      console.log('All demo account names (and phones) match seed.');
      return;
    }

    console.log(`Mismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      const wasName = [m.was.first_name, m.was.last_name].filter(Boolean).join(' ');
      const expName = [m.expected.firstName, m.expected.lastName].filter(Boolean).join(' ');
      console.log(`  ${m.email}: "${wasName}" → "${expName}"${m.expected.phone ? ` · phone ${m.was.phone || '—'} → ${m.expected.phone}` : ''}`);
    }

    if (dryRun) {
      console.log('Dry run — no changes written.');
      return;
    }

    let restored = 0;
    for (const m of mismatches) {
      await client.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             phone = COALESCE($3, phone),
             updated_at = NOW()
         WHERE id = $4::uuid`,
        [m.expected.firstName, m.expected.lastName || null, m.expected.phone ?? null, m.id],
      );
      restored += 1;
    }
    console.log(`Restored ${restored} account(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
