/* eslint-disable no-console */
/**
 * Restore Arjun Verma demo student (name + roll) for arjun.verma@iitm.edu.
 * Usage: node scripts/restore_arjun_demo.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const IITM_TENANT_ID = 'a1000000-0000-0000-0000-000000000001';
const ARJUN_USER_ID = 'b1000000-0000-0000-0000-000000000007';

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
  const connectionString =
    process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL required');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const before = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.tenant_id,
              sp.roll_number, sp.tenant_id AS profile_tenant_id, t.name AS college_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = 'arjun.verma@iitm.edu' OR u.id = $1::uuid`,
      [ARJUN_USER_ID],
    );
    console.log('Before:', JSON.stringify(before.rows, null, 2));

    await client.query(
      `UPDATE users
       SET first_name = 'Arjun',
           last_name = 'Verma',
           email = 'arjun.verma@iitm.edu',
           tenant_id = $1::uuid,
           role = 'student',
           is_active = true,
           updated_at = NOW()
       WHERE id = $2::uuid`,
      [IITM_TENANT_ID, ARJUN_USER_ID],
    );

    await client.query(
      `UPDATE student_profiles
       SET roll_number = 'CS2021001',
           enrollment_number = 'ENR-IITM-CS2021001',
           tenant_id = $1::uuid,
           department = 'Computer Science',
           branch = 'Computer Science & Engineering',
           updated_at = NOW()
       WHERE user_id = $2::uuid`,
      [IITM_TENANT_ID, ARJUN_USER_ID],
    );

    const after = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.tenant_id,
              sp.roll_number, t.name AS college_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1::uuid`,
      [ARJUN_USER_ID],
    );
    console.log('After:', JSON.stringify(after.rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
