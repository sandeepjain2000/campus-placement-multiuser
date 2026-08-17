const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'offers'`
    );
    console.log('OFFERS TABLE COLUMNS:');
    console.log(cols.rows);
    
    // Also query 1 row from offers to see actual data
    const rows = await pool.query(`SELECT * FROM offers LIMIT 1`);
    console.log('OFFERS SAMPLE ROW:', rows.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
