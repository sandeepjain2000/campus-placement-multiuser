/**
 * Shared paths for guided QA runners (Playwright + voice).
 * Runners live in qa/runners/guided/; playbooks & config in qa/guided/.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const RUNNER_DIR = path.dirname(fileURLToPath(import.meta.url));

/** campus-placement repo root */
export const REPO_ROOT = path.join(RUNNER_DIR, '..', '..', '..');

/** qa/ */
export const QA_ROOT = path.join(REPO_ROOT, 'qa');

/** qa/guided/ — playbooks & JSON config */
export const GUIDED_ROOT = path.join(QA_ROOT, 'guided');

/** qa/data/ — CSV, logs, voice output, prompts, pip requirements */
export const DATA_ROOT = path.join(QA_ROOT, 'data');

/** qa/guided/config/ — JSON manifests (use cases, focus areas, voice config) */
export const GUIDED_CONFIG_DIR = path.join(GUIDED_ROOT, 'config');

/** qa/guided/playbooks/ */
export const PLAYBOOKS_DIR = path.join(GUIDED_ROOT, 'playbooks');

/** qa/data/voice/ — TTS transcripts, audio, manifest */
export const VOICE_DIR = path.join(DATA_ROOT, 'voice');

/** qa/data/requirements/ — pip dependency lists for runners */
export const REQUIREMENTS_DIR = path.join(DATA_ROOT, 'requirements');

export function configPath(name) {
  return path.join(GUIDED_CONFIG_DIR, name);
}
