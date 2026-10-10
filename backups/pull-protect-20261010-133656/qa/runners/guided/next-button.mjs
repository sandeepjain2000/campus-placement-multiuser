/**
 * Playwright side — reads/writes guided testing SQLite directly.
 * Browser uses /api/guided-runner (same db file).
 */

import {
  GUIDED_TESTING_DB_PATH,
  acknowledgeGuidedClickInDb,
  armGuidedStep,
  clearGuidedStepState,
  endGuidedSession,
  pollGuidedClickAck,
  setGuidedIdle,
  setGuidedRunning,
  startGuidedSession,
} from '../../../src/lib/guidedRunnerDb.js';

export const ROOT_ID = 'ph-guided-next';

let waitGen = 0;

export async function setupNextClickBridge(_page) {
  /* no-op */
}

export async function installNextButton(_context) {
  /* session started from run-guided via SQLite */
}

export function attachRunnerResync(_page) {
  /* SQLite is shared — no resync needed */
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function clearRunnerUi(_page) {
  waitGen = 0;
  clearGuidedStepState();
}

export async function showRunnerRunning(_page, { stepIndex, stepTotal, label = 'N', phase, observe }) {
  setGuidedRunning({
    stepIndex,
    stepTotal,
    stepLabel: label,
    phase,
    observe,
  });
}

export async function finishRunning(_page, { stepIndex, stepTotal, label = 'N', phase, observe }) {
  setGuidedIdle({
    stepIndex,
    stepTotal,
    stepLabel: label,
    phase,
    observe,
  });
}

export async function waitForNextClick(_page, { stepIndex, stepTotal, label = 'N', phase, observe }) {
  waitGen += 1;
  const gen = waitGen;

  armGuidedStep({
    stepIndex,
    stepTotal,
    stepLabel: label,
    phase,
    observe,
    waitGen: gen,
  });

  await _page.bringToFront().catch(() => {});

  try {
    await _page.locator(`#${ROOT_ID}-btn`).waitFor({ state: 'visible', timeout: 15000 });
    console.log(`  ✓ SQLite step armed (gen ${gen}) — click blue screen tag top-right`);
    console.log(`  ✓ DB: ${GUIDED_TESTING_DB_PATH}`);
  } catch {
    console.warn('  ⚠ Screen tag not visible — ensure npm run dev is running');
  }

  while (!pollGuidedClickAck(gen)) {
    await sleep(80);
  }
}

/** Auto mode — arm step, brief pause, programmatic ack (no blue-tag click). */
export async function waitForAutoAdvance(_page, { stepIndex, stepTotal, label = 'N', phase, observe }, { pauseMs = 1500 } = {}) {
  waitGen += 1;
  const gen = waitGen;

  armGuidedStep({
    stepIndex,
    stepTotal,
    stepLabel: label,
    phase,
    observe,
    waitGen: gen,
  });

  await _page.bringToFront().catch(() => {});
  await _page.locator(`#${ROOT_ID}-btn`).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (pauseMs > 0) await sleep(pauseMs);

  acknowledgeGuidedClickInDb();

  const deadline = Date.now() + 5000;
  while (!pollGuidedClickAck(gen) && Date.now() < deadline) {
    await sleep(50);
  }
}

export async function removeNextButton(_page) {
  waitGen = 0;
  clearGuidedStepState();
}

export { startGuidedSession, endGuidedSession, GUIDED_TESTING_DB_PATH };
