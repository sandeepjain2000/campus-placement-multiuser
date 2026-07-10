import { errorMessageFromApiBody } from '@/lib/errorReference';

/**
 * Parse JSON from a fetch Response (never throws).
 * @param {Response} res
 */
export async function readApiJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * User-facing error text from a failed API response (includes [Ref: …] when present).
 * @param {Response} res
 * @param {string} [fallback]
 */
export async function apiErrorFromResponse(res, fallback = 'Request failed') {
  const json = await readApiJsonResponse(res);
  return errorMessageFromApiBody(json, fallback);
}

/**
 * Throw an Error with a support reference when res is not ok.
 * @param {Response} res
 * @param {string} [fallback]
 */
export async function throwIfApiError(res, fallback = 'Request failed') {
  if (res.ok) return readApiJsonResponse(res);
  const json = await readApiJsonResponse(res);
  throw new Error(errorMessageFromApiBody(json, fallback));
}
