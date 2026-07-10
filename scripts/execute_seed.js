import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  // Try to load .env.local manually if dotenv didn't pick it up
  if (!process.env.DATABASE_URL) {
    try {
      const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
      const lines = envLocal.split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
          process.env.DATABASE_URL = line.split('=')[1].trim();
        }
      }
    } catch(e) {}
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL environment variable is not set.');

  let config = {};
  try {
    const url = new URL(rawUrl);
    config = {
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: false }
    };
  } catch {
    config = { connectionString: rawUrl, ssl: { rejectUnauthorized: false } };
  }

  const client = new Client(config);
  await client.connect();

  const sqlPath = path.join(process.cwd(), 'db', 'seeds', '50_colleges_events.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Executing seed SQL...');
    await client.query(sql);
    console.log('Seed SQL executed successfully.');
  } catch (err) {
    console.error('Error executing seed SQL:', err);
  } finally {
    await client.end();
  }
}

run();
