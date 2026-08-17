import pkg from 'pg';
import path from 'path';
import { config } from 'dotenv';
import { REPO_ROOT } from '../lib/repo-root.mjs';

config({ path: path.join(REPO_ROOT, '.env.local') });

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function check() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'`);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
