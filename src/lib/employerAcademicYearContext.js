'use client';

import { useEffect, useState } from 'react';
import { readStoredActiveCampus } from '@/lib/employerActiveCampus';
import { writeActiveAcademicYearContext } from '@/lib/collegeAcademicYearContext';

const STORAGE_PREFIX = 'employerAcademicYearContext:';

export function readEmployerAcademicYearContext(campusId) {
  if (typeof window === 'undefined' || !campusId) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${campusId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeEmployerAcademicYearContext(campusId, ctx) {
  if (typeof window === 'undefined' || !campusId) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${campusId}`, JSON.stringify(ctx));
    writeActiveAcademicYearContext(ctx);
  } catch {
    /* ignore */
  }
}

function buildScopedQuery(basePath, campusId, ayCtx) {
  const params = new URLSearchParams();
  if (campusId) params.set('campusId', campusId);
  if (ayCtx?.id) params.set('academicYearId', ayCtx.id);
  else if (ayCtx?.label) params.set('academicYearLabel', ayCtx.label);
  const qs = params.toString();
  if (!qs) return basePath;
  const join = basePath.includes('?') ? '&' : '?';
  return `${basePath}${join}${qs}`;
}

/**
 * SWR/fetch path that includes active campus + academic year query params.
 * Updates when campus or academic year changes in the top bar.
 */
export function useEmployerScopedApiPath(basePath) {
  const [path, setPath] = useState(basePath);

  useEffect(() => {
    const sync = () => {
      const campus = readStoredActiveCampus();
      const ay = readEmployerAcademicYearContext(campus?.id);
      setPath(buildScopedQuery(basePath, campus?.id || null, ay));
    };
    sync();
    window.addEventListener('placementhub-academic-year', sync);
    window.addEventListener('placementhub-active-campus', sync);
    return () => {
      window.removeEventListener('placementhub-academic-year', sync);
      window.removeEventListener('placementhub-active-campus', sync);
    };
  }, [basePath]);

  return path;
}

/** Active campus object from session storage (id, name, …). */
export function useEmployerActiveCampus() {
  const [campus, setCampus] = useState(null);

  useEffect(() => {
    const sync = () => setCampus(readStoredActiveCampus());
    sync();
    window.addEventListener('placementhub-active-campus', sync);
    return () => window.removeEventListener('placementhub-active-campus', sync);
  }, []);

  return campus;
}
