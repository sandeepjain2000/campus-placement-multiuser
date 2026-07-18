import { formatCurrency, formatDate } from '@/lib/utils';
import { isBrowserLoadableAssetUrl, toSignedViewUrl } from '@/lib/clientAssetUrl';
import { normalizeOfferStatus } from '@/lib/offerStatusNormalize';

/** Predefined user-facing messages — never expose stack traces or DB details. */
export const STUDENT_OFFER_LETTER_ERRORS = Object.freeze({
  UNAUTHORIZED: 'Please sign in as a student to view this offer letter.',
  PROFILE_MISSING: 'Your student profile could not be found. Contact your placement office for help.',
  INVALID_ID: 'This offer link is invalid. Return to My Offers and open the letter again.',
  NOT_FOUND: 'This offer letter could not be found. It may have been removed or is not available for your account.',
  LOAD_FAILED: 'We could not load this offer letter right now. Please try again in a moment.',
  NETWORK: 'We could not reach the server. Check your connection and try again.',
  FILE_UNAVAILABLE: 'The attached offer letter file is unavailable. Contact your placement office if you need a signed copy.',
  FALLBACK_NOTICE:
    'A drafted letter was not attached for this offer. Showing your offer terms instead. Contact your placement office if you expected a signed PDF.',
  RESPOND_FAILED: 'We could not update this offer right now. Please try again in a moment.',
  RESPOND_EXPIRED: 'This offer has expired and can no longer be accepted or declined.',
  RESPOND_ALREADY_ACCEPTED: 'This offer was already accepted.',
  RESPOND_ALREADY_DECLINED: 'This offer was already declined.',
  RESPOND_REVOKED: 'This offer was revoked by the employer.',
  RESPOND_NOT_PENDING: 'Only pending offers can be accepted or declined.',
  RESPOND_FORBIDDEN: 'You are not allowed to accept this offer under current placement rules.',
});

/** API error strings that are safe to show for accept/decline. */
const SAFE_RESPOND_MESSAGES = new Set([
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_FAILED,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_EXPIRED,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_ALREADY_ACCEPTED,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_ALREADY_DECLINED,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_REVOKED,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_NOT_PENDING,
  STUDENT_OFFER_LETTER_ERRORS.RESPOND_FORBIDDEN,
  STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED,
  STUDENT_OFFER_LETTER_ERRORS.NOT_FOUND,
  STUDENT_OFFER_LETTER_ERRORS.NETWORK,
]);

/**
 * @param {number} [status]
 * @param {string} [apiError]
 */
export function resolveStudentOfferRespondErrorMessage(status, apiError) {
  const raw = String(apiError || '').trim();
  if (raw && SAFE_RESPOND_MESSAGES.has(raw)) return raw;
  // Match known API phrasing without leaking unexpected payloads
  if (/already accepted/i.test(raw)) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_ALREADY_ACCEPTED;
  if (/already declined/i.test(raw)) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_ALREADY_DECLINED;
  if (/expired/i.test(raw)) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_EXPIRED;
  if (/revoked/i.test(raw)) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_REVOKED;
  if (/pending/i.test(raw)) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_NOT_PENDING;
  if (/placement rules|not allowed|may not accept/i.test(raw)) {
    return STUDENT_OFFER_LETTER_ERRORS.RESPOND_FORBIDDEN;
  }
  const s = Number(status);
  if (s === 401) return STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED;
  if (s === 404) return STUDENT_OFFER_LETTER_ERRORS.NOT_FOUND;
  if (s === 410) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_EXPIRED;
  if (s === 403) return STUDENT_OFFER_LETTER_ERRORS.RESPOND_FORBIDDEN;
  if (s === 0 || Number.isNaN(s)) return STUDENT_OFFER_LETTER_ERRORS.NETWORK;
  return STUDENT_OFFER_LETTER_ERRORS.RESPOND_FAILED;
}

/**
 * Map HTTP status / known API codes to a predefined offer-letter message.
 * @param {number} [status]
 * @param {string} [code]
 */
export function resolveStudentOfferLetterErrorMessage(status, code) {
  const c = String(code || '').trim().toUpperCase();
  if (c && STUDENT_OFFER_LETTER_ERRORS[c]) return STUDENT_OFFER_LETTER_ERRORS[c];
  const s = Number(status);
  if (s === 401) return STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED;
  if (s === 400) return STUDENT_OFFER_LETTER_ERRORS.INVALID_ID;
  if (s === 404) return STUDENT_OFFER_LETTER_ERRORS.NOT_FOUND;
  if (s === 0 || Number.isNaN(s)) return STUDENT_OFFER_LETTER_ERRORS.NETWORK;
  return STUDENT_OFFER_LETTER_ERRORS.LOAD_FAILED;
}

/**
 * Safe browser URL for an attached offer letter file (external or site path).
 * Relative app routes that are not asset paths return null so we never navigate to a 404 page.
 */
export function resolveOfferLetterFileUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return null;
  if (!isBrowserLoadableAssetUrl(s)) return null;
  const signed = toSignedViewUrl(s);
  return signed || null;
}

/**
 * Build a plain-text fallback letter from offer fields when no drafted body exists.
 */
export function buildOfferLetterFallbackText(offer) {
  const company = String(offer?.company || 'Company').trim();
  const role = String(offer?.role || offer?.job_title || 'Role').trim();
  const location = String(offer?.location || 'As per company policy').trim();
  const salary =
    offer?.salary != null && Number(offer.salary) > 0
      ? formatCurrency(Number(offer.salary))
      : 'See compensation terms with your placement office';
  const joining = offer?.joiningDate || offer?.joining_date
    ? formatDate(offer.joiningDate || offer.joining_date)
    : 'To be confirmed';
  const deadline = offer?.deadline ? formatDate(offer.deadline) : null;

  const lines = [
    `Dear Student,`,
    ``,
    `We are pleased to confirm your offer for the position of ${role} at ${company}.`,
    ``,
    `Annual CTC: ${salary}`,
    `Location: ${location}`,
    `Joining date: ${joining}`,
  ];
  if (deadline) lines.push(`Please respond by: ${deadline}`);
  lines.push(``, `Regards,`, company);
  return lines.join('\n');
}

/**
 * @param {object} row — DB/API offer row for the student
 */
export function resolveStudentOfferLetterPayload(row) {
  const letterText = String(row?.renderedLetterHtml || row?.rendered_letter_html || '').trim();
  const rawFileUrl = String(row?.offerLetterUrl || row?.offer_letter_url || '').trim();
  const fileUrl = resolveOfferLetterFileUrl(rawFileUrl);
  const hasDraft = Boolean(letterText);
  const hasFile = Boolean(fileUrl);
  const hadInvalidFileUrl = Boolean(rawFileUrl) && !fileUrl;
  const fallbackText = !hasDraft ? buildOfferLetterFallbackText(row) : '';

  return {
    id: String(row.id),
    company: row.company || 'Company',
    role: row.role || row.job_title || 'Role',
    salary: row.salary,
    location: row.location,
    joiningDate: row.joiningDate || row.joining_date || null,
    deadline: row.deadline || null,
    status: normalizeOfferStatus(row.status),
    letterText: hasDraft ? letterText : fallbackText,
    letterSource: hasDraft ? 'draft' : hasFile ? 'file' : 'fallback',
    fileUrl,
    fileUnavailable: hadInvalidFileUrl,
    hasLetter: hasDraft || hasFile || Boolean(fallbackText),
  };
}
