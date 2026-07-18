/**
 * Client-side CV list loading — separates empty/missing from request failures.
 * Safe for 'use client' (no server-only imports).
 */

import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { formatErrorReference } from '@/lib/errorReference';

export const STUDENT_CV_LOAD = Object.freeze({
  OK: 'ok',
  EMPTY: 'empty',
  REQUEST_FAILED: 'request_failed',
  UNAVAILABLE: 'unavailable',
});

export const STUDENT_CV_LOAD_MESSAGES = Object.freeze({
  EMPTY: 'No CVs uploaded yet. Upload a labelled CV to get started.',
  REQUEST_FAILED: 'We could not load your CVs right now. You can keep using the page and try again.',
  UNAVAILABLE: 'CV management is not available on this campus yet. Contact your placement office if this continues.',
  MISSING_FILE: 'This file is no longer available. Re-upload the CV to replace it.',
  NETWORK: 'We could not reach the server. Check your connection and try again.',
});

function stripPlatformOpsCopy(raw) {
  return String(raw || '')
    .replace(/\s*Full details were saved for the platform administrator\.?/gi, '')
    .replace(/\s*Reference:\s*\S+/gi, '')
    .replace(/\s*\[Ref:[^\]]+\]/gi, '')
    .trim();
}

/**
 * Classify a CV-list API JSON body + HTTP status into a stable client result.
 * Never throws — callers can always render the rest of the page.
 *
 * @returns {{
 *   status: string,
 *   items: unknown[],
 *   message: string | null,
 *   errorCode?: string | null,
 *   reference?: string | null,
 *   legacy?: boolean,
 *   cvVerification?: object,
 *   legacyResumeAvailable?: boolean,
 * }}
 */
export function classifyStudentCvListResponse(res, json = {}) {
  const body = json && typeof json === 'object' ? json : {};
  const items = Array.isArray(body.items) ? body.items : [];
  const cleaned = stripPlatformOpsCopy(body.userMessage || body.error || body.warning || '');
  const meta = {
    errorCode: body.errorCode || null,
    reference: body.reference || null,
    cvVerification: body.cvVerification || null,
    legacyResumeAvailable: Boolean(body.legacyResumeAvailable),
  };

  // Soft unavailable (migration / setup) — not a hard page failure
  if (body.unavailable || body.cvManagementAvailable === false || res?.status === 503) {
    return {
      status: STUDENT_CV_LOAD.UNAVAILABLE,
      items: [],
      message: cleaned || STUDENT_CV_LOAD_MESSAGES.UNAVAILABLE,
      legacy: true,
      ...meta,
    };
  }

  if (!res || !res.ok) {
    if (res?.status === 404) {
      return {
        status: STUDENT_CV_LOAD.UNAVAILABLE,
        items: [],
        message: STUDENT_CV_LOAD_MESSAGES.UNAVAILABLE,
        legacy: true,
        ...meta,
      };
    }
    return {
      status: STUDENT_CV_LOAD.REQUEST_FAILED,
      items: [],
      message: cleaned || STUDENT_CV_LOAD_MESSAGES.REQUEST_FAILED,
      ...meta,
    };
  }

  // Soft warning / error on HTTP 200 with empty list (server soft-failure)
  if (!items.length && (body.warning || body.error || body.unavailable)) {
    const text = cleaned || STUDENT_CV_LOAD_MESSAGES.REQUEST_FAILED;
    const isSetup = /not available|migration|setup/i.test(text) || body.cvManagementAvailable === false;
    return {
      status: isSetup ? STUDENT_CV_LOAD.UNAVAILABLE : STUDENT_CV_LOAD.REQUEST_FAILED,
      items: [],
      message: text,
      legacy: isSetup,
      ...meta,
    };
  }

  if (!items.length) {
    return {
      status: STUDENT_CV_LOAD.EMPTY,
      items: [],
      message: STUDENT_CV_LOAD_MESSAGES.EMPTY,
      ...meta,
    };
  }

  return {
    status: STUDENT_CV_LOAD.OK,
    items,
    message: null,
    ...meta,
  };
}

/**
 * Ensure failed CV loads appear in Platform error logs when the server did not already log.
 * @param {{ status: string, message?: string | null, reference?: string | null, errorCode?: string | null }} classified
 * @param {{ route: string, statusCode?: number | null, responseBody?: object | null }} meta
 */
async function ensureCvLoadErrorLogged(classified, meta) {
  if (
    classified.status !== STUDENT_CV_LOAD.REQUEST_FAILED
    && classified.status !== STUDENT_CV_LOAD.UNAVAILABLE
  ) {
    return classified;
  }
  const existing =
    classified.reference
    || formatErrorReference(meta.responseBody?.referenceId)
    || meta.responseBody?.reference
    || null;
  if (existing) {
    return { ...classified, reference: existing };
  }

  const ref = await reportClientApiFailure({
    context: 'client_student_cv_list',
    route: meta.route,
    statusCode: meta.statusCode ?? null,
    message: classified.message || STUDENT_CV_LOAD_MESSAGES.REQUEST_FAILED,
    responseBody: meta.responseBody,
    severity: 'error',
    errorCode: classified.errorCode || meta.responseBody?.errorCode || null,
    details: { source: 'student_cv_load_client', loadStatus: classified.status },
  });

  if (!ref) return classified;
  return {
    ...classified,
    reference: ref,
    message: classified.message
      ? (classified.message.includes(`[Ref: ${ref}]`)
        ? classified.message
        : `${classified.message} [Ref: ${ref}]`)
      : classified.message,
  };
}

/**
 * Fetch student CV list with legacy fallback. Never throws.
 */
export async function fetchStudentCvListClassified(query = '') {
  const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  let res;
  let route = `/api/student/cv-list${suffix}`;
  try {
    res = await fetch(route, { credentials: 'include' });
    if (res.status === 404) {
      route = `/api/student/cvs${suffix}`;
      res = await fetch(route, { credentials: 'include' });
    }
  } catch {
    const failed = {
      status: STUDENT_CV_LOAD.REQUEST_FAILED,
      items: [],
      message: STUDENT_CV_LOAD_MESSAGES.NETWORK,
      errorCode: 'PH-CLIENT-NETWORK',
      reference: null,
    };
    return ensureCvLoadErrorLogged(failed, {
      route: '/api/student/cv-list',
      statusCode: null,
      responseBody: null,
    });
  }

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  const classified = classifyStudentCvListResponse(res, json);
  return ensureCvLoadErrorLogged(classified, {
    route: route.split('?')[0],
    statusCode: res.status,
    responseBody: json,
  });
}

/** True when a CV list row has no backing file. */
export function studentCvRowMissingFile(cv) {
  if (!cv || typeof cv !== 'object') return false;
  if (cv.hasFile === false || cv.has_file === false) return true;
  if (cv.fileMissing === true) return true;
  return false;
}
