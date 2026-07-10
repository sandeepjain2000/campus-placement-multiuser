/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const OUT_PATH = path.join(process.cwd(), 'docs', 'help', 'developer', 'database-schema.md');
const OVERVIEW_PATH = path.join(process.cwd(), 'docs', 'help', 'developer', 'database-relationships-overview.md');

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
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

function getDbUrl() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  return (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL
  );
}

function loadOverview() {
  if (!fs.existsSync(OVERVIEW_PATH)) {
    return '# Database schema\n\nOverview file missing. See `docs/help/developer/database-relationships-overview.md`.\n\n';
  }
  return fs.readFileSync(OVERVIEW_PATH, 'utf8').trim() + '\n\n---\n\n';
}

async function generateDocs() {
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL is required (.env or .env.local).');
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    const generatedAt = new Date().toISOString();

    let md = loadOverview();
    md += `# Database schema reference\n\n`;
    md += `> Auto-generated from the live database on ${generatedAt.slice(0, 10)}. Run \`npm run db:generate-docs\` to refresh.\n\n`;
    md += '## Table of contents\n\n';
    for (const table of tables) {
      md += `- [${table}](#${table.replace(/_/g, '-')})\n`;
    }
    md += '\n---\n\n';

    for (const table of tables) {
      md += `## ${table}\n\n`;

      const colRes = await client.query(
        `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `,
        [table],
      );

      md += '### Columns\n\n';
      md += '| Column | Type | Nullable | Default |\n';
      md += '|---|---|---|---|\n';
      for (const col of colRes.rows) {
        const def = col.column_default == null ? '' : String(col.column_default).replace(/\|/g, '\\|');
        md += `| \`${col.column_name}\` | ${col.data_type} | ${col.is_nullable} | ${def} |\n`;
      }
      md += '\n';

      const fkRes = await client.query(
        `
        SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
        ORDER BY kcu.column_name;
      `,
        [table],
      );

      if (fkRes.rows.length > 0) {
        md += '### Relationships (foreign keys)\n\n';
        md += '| Column | References |\n';
        md += '|---|---|\n';
        for (const fk of fkRes.rows) {
          md += `| \`${fk.column_name}\` | \`${fk.foreign_table_name}.${fk.foreign_column_name}\` |\n`;
        }
        md += '\n';
      }

      md += '---\n\n';
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, md, 'utf8');
    console.log(`Wrote ${OUT_PATH} (${tables.length} tables)`);
  } finally {
    client.release();
    await pool.end();
  }
}

generateDocs().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
