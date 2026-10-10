import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** campus-placement repo root (parent of adhoc/) */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

export function useRepoRoot() {
  process.chdir(REPO_ROOT);
  return REPO_ROOT;
}
