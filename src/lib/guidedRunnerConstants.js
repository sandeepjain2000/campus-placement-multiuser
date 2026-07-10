/** Legacy IDs — guided test state lives in SQLite (see guidedRunnerDb.js). */

export {
  GUIDED_RUNNER_ROOT_ID,
  GUIDED_RUNNER_POLL_EVENT as GUIDED_RUNNER_UPDATE_EVENT,
  acknowledgeGuidedNextClick,
  fetchGuidedState,
  isStepArmed as isGuidedRunnerArmed,
} from './guidedRunnerClient';

export const GUIDED_RUNNER_NEXT_LABEL = 'N';
export const GUIDED_RUNNER_BAR_HEIGHT_PX = 0;
export const GUIDED_RUNNER_VISIBLE_KEY = 'ph-guided-runner-bar-visible';

export function isGuidedRunnerRunning() {
  return false;
}

export function getGuidedRunnerStepHint() {
  return null;
}

export function isGuidedRunnerSessionActive() {
  return false;
}

export function markGuidedRunnerSessionActive() {
  /* session flag is in SQLite guided_session.active */
}

export function readGuidedRunnerStore() {
  return null;
}

export function writeGuidedRunnerStore() {
  /* no-op — use SQLite */
}

export function isGuidedRunnerBarVisiblePref() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(GUIDED_RUNNER_VISIBLE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setGuidedRunnerBarVisiblePref(visible) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUIDED_RUNNER_VISIBLE_KEY, visible ? 'true' : 'false');
    window.dispatchEvent(new Event('ph-guided-runner-update'));
  } catch {
    /* ignore */
  }
}
