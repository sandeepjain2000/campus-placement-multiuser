import pg from 'pg';
import path from 'path';
import { config } from 'dotenv';
import { REPO_ROOT } from '../lib/repo-root.mjs';

config({ path: path.join(REPO_ROOT, '.env.local') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Adding communication_email column to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS communication_email VARCHAR(255);
    `);
    
    console.log('Updating existing users with default communication email...');
    const res = await client.query(`
      UPDATE users 
      SET communication_email = 'sandeepjain200019@gmail.com'
      WHERE communication_email IS NULL;
    `);
    
    console.log(`Updated ${res.rowCount} rows.`);
    
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
