'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getDevScreenId } from '@/config/devScreenIds';
import { isGuidedRunnerFeatureEnabled } from '@/lib/guidedRunnerConfig';
import {
  GUIDED_RUNNER_ROOT_ID,
  GUIDED_RUNNER_DISABLED_MESSAGE,
  GUIDED_RUNNER_POLL_EVENT,
  acknowledgeGuidedNextClick,
  fetchGuidedState,
  isGuidedRunnerApiDisabled,
  isStepArmed,
} from '@/lib/guidedRunnerClient';

function showDevScreenTag(pathname, sessionActive) {
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS === 'false') return false;
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  const p = pathname || '';
  if (p === '/' && sessionActive) return true;
  if ((p === '/login' || p === '/sign-in') && sessionActive) return true;
  if (p.startsWith('/developer')) return true;
  return p.startsWith('/dashboard') || p.startsWith('/data-entry');
}

function shouldAnnounceGuidedUnavailable(pathname) {
  const p = pathname || '';
  if (process.env.NEXT_PUBLIC_SHOW_DEV_SCREEN_IDS === 'true') return true;
  if (p.startsWith('/developer')) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return p.startsWith('/dashboard') || p.startsWith('/data-entry');
}

function resolveScreenId(pathname) {
  if (pathname === '/') return 'LANDING';
  if (pathname === '/login') return 'LOGIN';
  if (pathname === '/sign-in') return 'SIGN_IN';
  if (pathname === '/developer') return 'DEV_NOTES';
  if (pathname === '/developer/use-cases-more') return 'DEV_USE_CASES_MORE';
  return getDevScreenId(pathname);
}

export default function DevScreenTag({ screenId } = {}) {
  const pathname = usePathname();
  const id = screenId || resolveScreenId(pathname);
  const guidedRunnerEnabled = isGuidedRunnerFeatureEnabled();
  const [sessionActive, setSessionActive] = useState(false);
  const [armed, setArmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [stepHint, setStepHint] = useState(null);
  const [flash, setFlash] = useState(false);
  const [rejectFlash, setRejectFlash] = useState(false);
  const [clickHint, setClickHint] = useState('');
  const [apiUnavailable, setApiUnavailable] = useState(() => isGuidedRunnerApiDisabled());
  const [pollingStopped, setPollingStopped] = useState(
    () => !guidedRunnerEnabled || isGuidedRunnerApiDisabled(),
  );
  const clickInFlight = useRef(false);
  const intervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPollingStopped(true);
  }, []);

  const applyState = useCallback((data) => {
    if (!data?.ok) return;
    setSessionActive(!!data.session?.active);
    setArmed(isStepArmed(data.step));
    setRunning(!!data.step?.running);
    if (data.step?.stepIndex != null && data.step?.stepTotal != null) {
      setStepHint(`${data.step.stepIndex}/${data.step.stepTotal}`);
    } else {
      setStepHint(null);
    }
  }, []);

  const sync = useCallback(async () => {
    if (!guidedRunnerEnabled || pollingStopped || isGuidedRunnerApiDisabled()) {
      return { ok: false };
    }

    try {
      const data = await fetchGuidedState();
      if (data?.disabled) {
        setApiUnavailable(true);
        stopPolling();
        return data;
      }
      if (data?.ok) {
        applyState(data);
      }
      return data;
    } catch {
      return { ok: false };
    }
  }, [applyState, guidedRunnerEnabled, pollingStopped, stopPolling]);

  useEffect(() => {
    if (!guidedRunnerEnabled || pollingStopped || isGuidedRunnerApiDisabled()) {
      if (isGuidedRunnerApiDisabled()) {
        setApiUnavailable(true);
        setPollingStopped(true);
      }
      return undefined;
    }

    void sync();

    const onUpdate = () => {
      if (!pollingStopped && !isGuidedRunnerApiDisabled()) {
        void sync();
      }
    };

    window.addEventListener(GUIDED_RUNNER_POLL_EVENT, onUpdate);
    const intervalMs = armed ? 80 : sessionActive ? 150 : 450;
    intervalRef.current = window.setInterval(() => {
      if (pollingStopped || isGuidedRunnerApiDisabled()) {
        stopPolling();
        return;
      }
      void sync();
    }, intervalMs);

    return () => {
      window.removeEventListener(GUIDED_RUNNER_POLL_EVENT, onUpdate);
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sync, armed, sessionActive, guidedRunnerEnabled, pollingStopped, stopPolling]);

  const handleAckClick = useCallback(async () => {
    if (clickInFlight.current || apiUnavailable) return;
    clickInFlight.current = true;
    setClickHint('');

    try {
      const result = await acknowledgeGuidedNextClick();
      if (result.ok) {
        setFlash(true);
        setArmed(false);
        window.setTimeout(() => setFlash(false), 400);
      } else if (result.reason === 'disabled') {
        setApiUnavailable(true);
        stopPolling();
      } else if (result.reason === 'running') {
        setRejectFlash(true);
        setClickHint('Running…');
        window.setTimeout(() => setRejectFlash(false), 500);
      } else {
        setRejectFlash(true);
        setClickHint('Wait for terminal');
        window.setTimeout(() => {
          setRejectFlash(false);
          setClickHint('');
        }, 900);
      }
      if (result.reason !== 'disabled') {
        await sync();
      }
    } finally {
      clickInFlight.current = false;
    }
  }, [apiUnavailable, stopPolling, sync]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key !== 'Enter' || !ev.altKey) return;
      if (!armed || clickInFlight.current || apiUnavailable) return;
      ev.preventDefault();
      void handleAckClick();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armed, apiUnavailable, handleAckClick]);

  if (apiUnavailable && shouldAnnounceGuidedUnavailable(pathname)) {
    return (
      <span
        className="dev-guided-unavailable"
        title={GUIDED_RUNNER_DISABLED_MESSAGE}
        aria-label={GUIDED_RUNNER_DISABLED_MESSAGE}
      >
        Guided testing off
      </span>
    );
  }

  if (!showDevScreenTag(pathname, sessionActive) || !id) return null;

  const titleParts = [`Screen ${id}`, pathname];
  if (stepHint) titleParts.push(`step ${stepHint}`);
  if (clickHint) titleParts.push(clickHint);
  else if (armed) titleParts.push('click to run this step (Alt+Enter)');
  else if (running) titleParts.push('running…');
  else if (sessionActive) titleParts.push('wait for step in terminal');
  const title = titleParts.join(' · ');

  const className = [
    'dev-screen-id-tag',
    armed ? 'dev-screen-id-tag--armed' : '',
    running ? 'dev-screen-id-tag--running' : '',
    flash ? 'dev-screen-id-tag--clicked' : '',
    rejectFlash ? 'dev-screen-id-tag--reject' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (armed) {
    return (
      <button
        type="button"
        id={`${GUIDED_RUNNER_ROOT_ID}-btn`}
        className={className}
        title={title}
        aria-label={`Next test step — screen ${id}`}
        aria-busy={clickInFlight.current}
        onClick={() => {
          void handleAckClick();
        }}
      >
        {id}
      </button>
    );
  }

  return (
    <span className={className} title={title} aria-label={`Development screen id ${id}`}>
      {id}
    </span>
  );
}
