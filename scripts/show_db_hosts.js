/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

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

function hostOf(url) {
  if (!url) return '(missing)';
  try {
    return new URL(url).hostname;
  } catch {
    const m = String(url).match(/@([^/?:]+)/);
    return m ? m[1] : '(unparseable)';
  }
}

const files = ['.env', '.env.local', '.env.vercel.production'];
for (const f of files) {
  const env = readEnvFile(f);
  const url = env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  console.log(f, '→', hostOf(url));
}
