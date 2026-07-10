'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GUIDED_RUNNER_NEXT_LABEL,
  GUIDED_RUNNER_ROOT_ID,
  GUIDED_RUNNER_UPDATE_EVENT,
  isGuidedRunnerBarVisiblePref,
  isGuidedRunnerSessionActive,
  readGuidedRunnerStore,
  setGuidedRunnerBarVisiblePref,
  writeGuidedRunnerStore,
} from '@/lib/guidedRunnerConstants';

function acknowledgeClick(store) {
  if (!store?.armed || store.running || !store.waitGen) return null;
  return {
    ...store,
    clickAck: store.waitGen,
    armed: false,
  };
}

export default function GuidedRunnerBar() {
  const [sessionActive, setSessionActive] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const [store, setStore] = useState(null);
  const [clickedFlash, setClickedFlash] = useState(false);

  const syncFromStorage = useCallback(() => {
    setSessionActive(isGuidedRunnerSessionActive());
    setBarVisible(isGuidedRunnerBarVisiblePref());
    setStore(readGuidedRunnerStore());
  }, []);

  useEffect(() => {
    syncFromStorage();
    const onUpdate = () => syncFromStorage();
    window.addEventListener(GUIDED_RUNNER_UPDATE_EVENT, onUpdate);
    const interval = window.setInterval(syncFromStorage, 400);
    return () => {
      window.removeEventListener(GUIDED_RUNNER_UPDATE_EVENT, onUpdate);
      window.clearInterval(interval);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    document.body.classList.toggle('ph-guided-runner-session', sessionActive);
    return () => document.body.classList.remove('ph-guided-runner-session');
  }, [sessionActive]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key !== 'Enter' || !ev.altKey) return;
      const current = readGuidedRunnerStore();
      const next = acknowledgeClick(current);
      if (!next) return;
      ev.preventDefault();
      writeGuidedRunnerStore(next);
      setClickedFlash(true);
      window.setTimeout(() => setClickedFlash(false), 400);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onNextClick = () => {
    const current = readGuidedRunnerStore();
    const next = acknowledgeClick(current);
    if (!next) return;
    writeGuidedRunnerStore(next);
    setClickedFlash(true);
    window.setTimeout(() => setClickedFlash(false), 400);
  };

  const toggleVisible = () => {
    const next = !barVisible;
    setGuidedRunnerBarVisiblePref(next);
    setBarVisible(next);
  };

  const armed = !!store?.armed && !store?.running;
  const running = !!store?.running;
  const display = store?.display;
  const stepIndex = display?.stepIndex ?? '—';
  const stepTotal = display?.stepTotal ?? '—';
  const nextLabel = display?.label || GUIDED_RUNNER_NEXT_LABEL;

  if (!barVisible) {
    return (
      <button
        type="button"
        className="ph-guided-runner-restore"
        onClick={toggleVisible}
        aria-label="Show test controls"
        title="Show test controls"
      >
        {GUIDED_RUNNER_NEXT_LABEL}
      </button>
    );
  }

  return (
    <div
      id={GUIDED_RUNNER_ROOT_ID}
      className={`ph-guided-runner-bar${armed ? ' is-armed-wrap' : ''}`}
      data-ph-test-runner
      data-ph-guided-runner-bar
    >
      <Link
        href="/developer"
        target="_blank"
        rel="noopener noreferrer"
        className="ph-guided-runner-bar__link"
        title="Developer notes (new tab)"
      >
        Dev
      </Link>
      <Link
        href="/data-entry"
        target="_blank"
        rel="noopener noreferrer"
        className="ph-guided-runner-bar__link"
        title="Demo data (new tab)"
      >
        Data
      </Link>
      <span
        className="ph-guided-runner-bar__step"
        title={
          sessionActive
            ? 'Guided test step'
            : 'Start tests: npm run test:guided:playbook (terminal 2)'
        }
      >
        {stepIndex}/{stepTotal}
      </span>
      <button
        type="button"
        id={`${GUIDED_RUNNER_ROOT_ID}-btn`}
        className={`ph-guided-runner-bar__next${armed ? ' is-armed' : ''}${running ? ' is-running' : ''}${clickedFlash ? ' is-clicked' : ''}`}
        disabled={!armed || running}
        onClick={onNextClick}
        title={
          armed
            ? 'Next test step — click here (Alt+Enter)'
            : running
              ? 'Running automated step…'
              : 'Run npm run test:guided:playbook first — then N turns blue'
        }
        aria-label="Next guided test step"
      >
        {nextLabel}
      </button>
      <button
        type="button"
        className="ph-guided-runner-bar__hide"
        onClick={toggleVisible}
        aria-label="Hide test controls"
        title="Hide"
      >
        ×
      </button>
    </div>
  );
}
