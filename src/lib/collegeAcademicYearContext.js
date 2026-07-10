'use client';

import { useEffect, useState } from 'react';

/** sessionStorage key for active placement session (college admin). */
export const ACTIVE_ACADEMIC_YEAR_KEY = 'activeAcademicYearContext';

export function readActiveAcademicYearContext() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_ACADEMIC_YEAR_KEY);
    if (!raw) {
      const legacy = sessionStorage.getItem('activeAcademicYear');
      if (legacy) return { id: null, label: legacy };
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeActiveAcademicYearContext(ctx) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACTIVE_ACADEMIC_YEAR_KEY, JSON.stringify(ctx));
    sessionStorage.setItem('activeAcademicYear', ctx?.label || '');
    window.dispatchEvent(new Event('placementhub-academic-year'));
  } catch {
    /* ignore */
  }
}

export function academicYearQueryString(ctx) {
  if (!ctx) return '';
  const params = new URLSearchParams();
  if (ctx.id) params.set('academicYearId', ctx.id);
  else if (ctx.label) params.set('academicYearLabel', ctx.label);
  const q = params.toString();
  return q ? `?${q}` : '';
}

/** SWR/fetch path that updates when the Academic Year dropdown changes. */
export function useCollegeAcademicYearApiPath(basePath) {
  const [path, setPath] = useState(basePath);
  useEffect(() => {
    const sync = () => {
      setPath(`${basePath}${academicYearQueryString(readActiveAcademicYearContext())}`);
    };
    sync();
    window.addEventListener('placementhub-academic-year', sync);
    return () => window.removeEventListener('placementhub-academic-year', sync);
  }, [basePath]);
  return path;
}
