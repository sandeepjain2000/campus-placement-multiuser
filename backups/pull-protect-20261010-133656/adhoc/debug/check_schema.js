const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');
const dbUrl = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=([^\r\n]+)/)[1].replace(/['"]/g, '');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
async function run() {
  const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'employer_approvals'`);
  r.rows.forEach(row => console.log(row.column_name));
  pool.end();
}
run().catch(console.error);
