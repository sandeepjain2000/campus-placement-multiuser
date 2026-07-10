/** Browser client for guided testing (SQLite via /api/guided-runner). */

export const GUIDED_RUNNER_ROOT_ID = 'ph-guided-next';
export const GUIDED_RUNNER_POLL_EVENT = 'ph-guided-runner-poll';

export const GUIDED_RUNNER_DISABLED_MESSAGE =
  'Guided testing is not available in this environment. Refresh the page if it becomes enabled.';

/** Set after the first HTTP 403 — blocks further polls until a full page reload. */
let guidedRunnerApiDisabled = false;

export function isGuidedRunnerApiDisabled() {
  return guidedRunnerApiDisabled;
}

function markGuidedRunnerApiDisabled(error) {
  guidedRunnerApiDisabled = true;
  return {
    ok: false,
    session: null,
    step: null,
    disabled: true,
    status: 403,
    error: error || GUIDED_RUNNER_DISABLED_MESSAGE,
  };
}

export function emitGuidedPoll() {
  if (typeof window === 'undefined' || guidedRunnerApiDisabled) return;
  window.dispatchEvent(new Event(GUIDED_RUNNER_POLL_EVENT));
}

export async function fetchGuidedState(includeLog = false) {
  if (guidedRunnerApiDisabled) {
    return markGuidedRunnerApiDisabled();
  }

  const q = includeLog ? '?log=1' : '';
  try {
    const res = await fetch(`/api/guided-runner/state${q}`, { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      return markGuidedRunnerApiDisabled(data.error);
    }
    if (!res.ok) {
      return { ok: false, session: null, step: null, status: res.status, error: data.error };
    }
    return data;
  } catch {
    return { ok: false, session: null, step: null, error: 'network' };
  }
}

export async function postGuidedClick() {
  if (guidedRunnerApiDisabled) {
    return { ok: false, disabled: true, error: GUIDED_RUNNER_DISABLED_MESSAGE };
  }

  try {
    const res = await fetch('/api/guided-runner/click', {
      method: 'POST',
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      markGuidedRunnerApiDisabled(data.error);
      return { ok: false, disabled: true, error: data.error || GUIDED_RUNNER_DISABLED_MESSAGE };
    }
    emitGuidedPoll();
    return data;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export function isStepArmed(step) {
  return !!(step?.armed && !step?.running && step?.waitGen);
}

export async function acknowledgeGuidedNextClick() {
  if (guidedRunnerApiDisabled) {
    return { ok: false, reason: 'disabled' };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const data = await postGuidedClick();
    if (data.ok) return { ok: true };
    if (data.disabled) return { ok: false, reason: 'disabled' };

    if (attempt >= 3) {
      return { ok: false, reason: data.reason || data.error || 'not_armed' };
    }

    await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
    const state = await fetchGuidedState();
    if (state.disabled) return { ok: false, reason: 'disabled' };
    if (!isStepArmed(state.step)) {
      return { ok: false, reason: data.reason || data.error || 'not_armed' };
    }
  }

  return { ok: false, reason: 'not_armed' };
}
