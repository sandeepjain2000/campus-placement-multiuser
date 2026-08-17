#!/usr/bin/env node
/** @deprecated Use qa/runners/guided/run-guided.mjs — this forwards for old bookmarks. */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const real = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../runners/guided/run-guided.mjs');
const result = spawnSync(process.execPath, [real, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
