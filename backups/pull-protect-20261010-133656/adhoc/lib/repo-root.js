const path = require('path');

/** campus-placement repo root (parent of adhoc/) */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Resolve paths from repo root even when cwd differs. */
function useRepoRoot() {
  process.chdir(REPO_ROOT);
  return REPO_ROOT;
}

module.exports = { REPO_ROOT, useRepoRoot };
