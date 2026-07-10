#!/usr/bin/env node
/**
 * Checks validation message alignment against formFieldRegistry.js expectations.
 * Run: npm run scan:validation-alignment
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');

const { FORM_FIELD_REGISTRY_SCREENS } = await import(
  pathToFileURL(path.join(root, 'src/content/formFieldRegistry.js')).href
);

/** @type {string[]} */
let srcFilesCache = null;

function listSrcFiles(dir = srcRoot) {
  if (dir === srcRoot && srcFilesCache) return srcFilesCache;
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      out.push(...listSrcFiles(abs));
    } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      out.push(abs);
    }
  }
  if (dir === srcRoot) srcFilesCache = out;
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalizeNeedle(msg) {
  return String(msg || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.]+$/g, '')
    .slice(0, 32)
    .toLowerCase();
}

function messageExistsInSrc(msg) {
  const needle = normalizeNeedle(msg);
  if (!needle) return true;
  return listSrcFiles().some((abs) => fs.readFileSync(abs, 'utf8').toLowerCase().includes(needle));
}

const issues = [];

for (const screen of FORM_FIELD_REGISTRY_SCREENS) {
  if (screen.clientValidation) {
    const rel = screen.clientValidation.split('→')[0].trim();
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      issues.push(`Missing client validation file for ${screen.id}: ${rel}`);
    }
  }

  for (const field of screen.fields) {
    for (const errMsg of field.commonErrors) {
      if (!errMsg) continue;
      if (!messageExistsInSrc(errMsg)) {
        issues.push(`[${screen.id}/${field.key}] Expected error not found in codebase: "${errMsg}"`);
      }
    }
  }
}

const internshipMeta = read('src/lib/internshipPostingMeta.js');
if (internshipMeta.includes('Both internship start date and end date are required')) {
  issues.push('Deprecated vague date error still present in internshipPostingMeta.js');
}

if (issues.length) {
  console.error('Validation alignment scan failed:\n');
  for (const issue of issues) console.error(` - ${issue}`);
  process.exit(1);
}

console.log(`Validation alignment OK (${FORM_FIELD_REGISTRY_SCREENS.length} screens checked).`);
