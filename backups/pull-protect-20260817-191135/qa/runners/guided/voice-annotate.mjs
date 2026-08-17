/**
 * Node wrapper — calls voice-annotate.py (Edge TTS + transcripts).
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REPO_ROOT, configPath } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = configPath('guided-voice-config.json');
const PY_SCRIPT = path.join(__dirname, 'voice-annotate.py');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadVoiceConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function pythonCmd() {
  return process.env.PYTHON || 'python';
}

export function announceStep({ stageKey, role, text, auto }) {
  const body = String(text || '').trim();
  if (!body) return;

  const result = spawnSync(
    pythonCmd(),
    [PY_SCRIPT, '--stage-key', stageKey, '--role', role || 'STEP', '--text', body, ...(auto ? ['--auto'] : [])],
    { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true },
  );

  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || '').trim();
    console.warn(`  [voice] ${msg || 'annotation failed — install: pip install -r qa/data/requirements/requirements-voice.txt'}`);
  } else if (result.stdout?.trim()) {
    for (const line of result.stdout.trim().split('\n')) {
      console.log(`  [voice] ${line}`);
    }
  }
}

export async function pauseBetweenRoles(auto) {
  if (!auto) return;
  const cfg = loadVoiceConfig();
  const autoRun = cfg.auto_run || {};
  let sec = 6;
  try {
    sec = Math.max(0, Number(autoRun.pause_between_roles_sec ?? 6));
  } catch {
    sec = 6;
  }
  if (sec > 0) {
    console.log(`  [auto] Pause ${sec}s before next role…`);
    await sleep(sec * 1000);
  }
}
