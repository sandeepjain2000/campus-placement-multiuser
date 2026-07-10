#!/usr/bin/env node
/** @deprecated Use qa/runners/guided/run-use-case-voice.mjs */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const real = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../runners/guided/run-use-case-voice.mjs');
const result = spawnSync(process.execPath, [real, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
