/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

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

async function main() {
  const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
  const connectionString =
    process.env.DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const cfg = (
      await client.query(
        'SELECT highlight_color, selected_items, selected_entities FROM menu_highlight_config WHERE id = 1',
      )
    ).rows[0];
    const iitm = (
      await client.query(`SELECT id, role, tenant_id FROM users WHERE email = 'admin@iitm.edu' LIMIT 1`)
    ).rows[0];
    const nitt = (
      await client.query(`SELECT id, role, tenant_id FROM users WHERE email = 'admin@nitt.edu' LIMIT 1`)
    ).rows[0];
    const entities = cfg.selected_entities || [];
    const items = (cfg.selected_items && cfg.selected_items.college_admin) || [];
    const match = (u) =>
      Boolean(u) && entities.some((e) => e.type === 'college' && e.id === String(u.tenant_id));
    const result = {
      color: cfg.highlight_color,
      items,
      iitmMatch: match(iitm),
      nittMatch: match(nitt),
      iitmWouldHighlight: match(iitm) && items.includes('/dashboard/college/students'),
      nittWouldHighlight: match(nitt) && items.includes('/dashboard/college/students'),
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.iitmWouldHighlight || result.nittWouldHighlight) {
      console.error('RESOLVE SMOKE FAIL');
      process.exit(1);
    }
    console.log('RESOLVE SMOKE PASS');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
