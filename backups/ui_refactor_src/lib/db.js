import { Pool } from 'pg';
import { getPgSslOption } from '@/lib/pgSsl';

// Parse DATABASE_URL manually so that percent-encoded special characters
// in the password (e.g. %2B → +, %21 → !) are correctly decoded before
// being passed to the pg driver. Using connectionString directly causes
// Supabase to reject the login because the encoded string is sent as-is.
function buildPoolConfig() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL environment variable is not set.');

  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: getPgSslOption(url.hostname),
    };
  } catch {
    const m = String(rawUrl).match(/@([^/?:]+)/);
    const hostHint = m ? m[1] : '';
    // Fallback to connectionString if URL parsing fails
    return {
      connectionString: rawUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: getPgSslOption(hostHint),
    };
  }
}

/** Lazy pool so importing this module during `next build` does not require DATABASE_URL. */
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

/**
 * Execute a query against the database
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Database query error:', { text: text.substring(0, 80), error: error.message });
    } else {
      console.error('Database query error:', error.message);
    }
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<import('pg').PoolClient>}
 */
export async function getClient() {
  const client = await getPool().connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Set a timeout to auto-release
  const timeout = setTimeout(() => {
    console.error('Client has been checked out for too long!');
    client.release();
  }, 30000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

/**
 * Execute a transaction
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>}
 */
export async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default { query, getClient, transaction };
