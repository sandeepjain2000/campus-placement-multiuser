#!/usr/bin/env node
/**
 * Convert NVIDIA key JSON files to Vercel-importable .env files.
 *
 * Usage:
 *   node scripts/nvidia-json-to-vercel-env.mjs
 *   node scripts/nvidia-json-to-vercel-env.mjs nvidia_keys/key26.json nvidia_keys/key27.json
 *   node scripts/nvidia-json-to-vercel-env.mjs --dir nvidia_keys
 *
 * Output (gitignored): vercel-import/nvidia-*.env
 *   - First key  → NVIDIA_API_KEY
 *   - Second key → NVIDIA_API_KEY_2
 *   - Third key  → NVIDIA_API_KEY_3
 * Also writes vercel-import/nvidia-combined.env (all keys, single import).
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'vercel-import');

function loadKeyFromJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const key = String(data?.api_key || data?.NVIDIA_API_KEY || '').trim();
  if (!key) throw new Error(`No api_key in ${filePath}`);
  return key;
}

function envVarName(index) {
  return index === 0 ? 'NVIDIA_API_KEY' : `NVIDIA_API_KEY_${index + 1}`;
}

function parseArgs(argv) {
  const files = [];
  let dir = null;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--dir' && argv[i + 1]) {
      dir = path.resolve(repoRoot, argv[i + 1]);
      i += 1;
    } else if (!argv[i].startsWith('-')) {
      files.push(path.resolve(repoRoot, argv[i]));
    }
  }
  if (dir) {
    const jsonFiles = readdirSync(dir)
      .filter((n) => n.toLowerCase().endsWith('.json'))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((n) => path.join(dir, n));
    return jsonFiles;
  }
  if (files.length) return files;
  const defaultDir = path.join(repoRoot, 'nvidia_keys');
  if (!existsSync(defaultDir)) {
    console.error(
      'No JSON files given and nvidia_keys/ is missing.\n' +
        'Copy your key*.json files into campus-placement/nvidia_keys/ then run again,\n' +
        'or: node scripts/nvidia-json-to-vercel-env.mjs --dir path/to/json/folder',
    );
    process.exit(1);
  }
  return readdirSync(defaultDir)
    .filter((n) => n.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((n) => path.join(defaultDir, n));
}

function main() {
  const jsonPaths = parseArgs(process.argv);
  if (!jsonPaths.length) {
    console.error('No .json key files found.');
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const lines = [
    '# Generated for Vercel → Import .env (do not commit)',
    `NVIDIA_API_BASE_URL=${process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1'}`,
    `NVIDIA_CHAT_MODEL=${process.env.NVIDIA_CHAT_MODEL || 'meta/llama-3.1-8b-instruct'}`,
    '',
  ];

  const written = [];

  for (let i = 0; i < jsonPaths.length; i += 1) {
    const filePath = jsonPaths[i];
    if (!existsSync(filePath)) {
      console.error('Missing:', filePath);
      process.exit(1);
    }
    const key = loadKeyFromJson(filePath);
    const varName = envVarName(i);
    const base = path.basename(filePath, '.json');
    const singleBody = [
      '# Paste into Vercel Import .env',
      `${varName}=${key}`,
      `NVIDIA_API_BASE_URL=${process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1'}`,
      `NVIDIA_CHAT_MODEL=${process.env.NVIDIA_CHAT_MODEL || 'meta/llama-3.1-8b-instruct'}`,
      '',
    ].join('\n');
    const outFile = path.join(outDir, `${base}.env`);
    writeFileSync(outFile, singleBody, 'utf8');
    written.push(outFile);
    lines.push(`${varName}=${key}`);
    console.log(`Wrote ${path.relative(repoRoot, outFile)} (${varName})`);
  }

  const combinedPath = path.join(outDir, 'nvidia-combined.env');
  writeFileSync(combinedPath, `${lines.join('\n')}\n`, 'utf8');
  written.push(combinedPath);
  console.log(`Wrote ${path.relative(repoRoot, combinedPath)} (all ${jsonPaths.length} keys — one import)`);
  console.log('\nImport on Vercel:');
  console.log('  • One shot: vercel-import/nvidia-combined.env');
  console.log('  • Or import each vercel-import/<keyname>.env separately (use different var names per file).');
}

main();
