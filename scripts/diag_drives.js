/**
 * diag_drives.js — quick diagnostic for employer drives data
 * node scripts/diag_drives.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envText = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const dbUrl = envText.split('\n').find((l) => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // 1. Check ctc_breakup column exists
    const col = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'placement_drives' AND column_name = 'ctc_breakup'
    `);
    console.log('ctc_breakup column exists:', col.rows.length > 0);

    // 2. Check all columns in placement_drives
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'placement_drives' ORDER BY ordinal_position
    `);
    console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));

    // 3. Count all drives
    const total = await client.query('SELECT COUNT(*) FROM placement_drives');
    console.log('\nTotal drives in DB:', total.rows[0].count);

    // 4. Drives for IIT Madras
    const iitm = await client.query(`
      SELECT d.id, ep.company_name, d.title, d.drive_date, d.status, d.employer_id
      FROM placement_drives d
      JOIN employer_profiles ep ON ep.id = d.employer_id
      JOIN tenants t ON t.id = d.tenant_id
      WHERE t.name ILIKE '%Madras%'
      ORDER BY d.drive_date
    `);
    console.log('\nDrives for IIT Madras:', iitm.rows.length);
    iitm.rows.forEach(r => console.log(`  ${r.drive_date?.toISOString?.().slice(0,10)} | ${r.company_name} | ${r.status} | emp_id=${r.employer_id}`));

    // 5. TechCorp employer profile
    const tc = await client.query(`
      SELECT ep.id, ep.company_name, u.email, u.id as user_id
      FROM employer_profiles ep
      JOIN users u ON u.id = ep.user_id
      WHERE ep.company_name ILIKE '%TechCorp%'
    `);
    console.log('\nTechCorp employer_profiles:');
    tc.rows.forEach(r => console.log(`  ep.id=${r.id} | user_id=${r.user_id} | email=${r.email}`));

    // 6. Drives for TechCorp by employer_id
    if (tc.rows.length > 0) {
      const tcDrives = await client.query(
        'SELECT id, title, drive_date, status, tenant_id FROM placement_drives WHERE employer_id = $1',
        [tc.rows[0].id]
      );
      console.log(`\nDrives WHERE employer_id=${tc.rows[0].id}:`, tcDrives.rows.length);
      tcDrives.rows.forEach(r => console.log(`  ${r.drive_date?.toISOString?.().slice(0,10)} | ${r.title?.slice(0,50)} | ${r.status}`));
    }

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
