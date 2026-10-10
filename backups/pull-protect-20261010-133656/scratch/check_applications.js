const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const tableCheck = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%application%'`
    );
    console.log('Application tables:', tableCheck.rows);

    for (const t of tableCheck.rows) {
      const name = t.table_name;
      const cols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
        [name]
      );
      console.log(`\nColumns of ${name}:`, cols.rows.map(c => c.column_name).join(', '));
      
      const count = await pool.query(`SELECT COUNT(*) FROM ${name}`);
      console.log(`Row count for ${name}:`, count.rows[0].count);

      const sample = await pool.query(`SELECT * FROM ${name} LIMIT 3`);
      console.log(`Sample rows for ${name}:`, sample.rows);
    }

    const selectUsers = await pool.query(
      `SELECT id, email, role, is_active FROM users WHERE role = 'student' LIMIT 5`
    );
    console.log('\nStudent Users:', selectUsers.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
