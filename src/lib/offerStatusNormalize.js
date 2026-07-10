import { isOfferDeadlinePassed } from '@/lib/offerDeadline';

const VALID = new Set(['pending', 'accepted', 'rejected', 'expired', 'revoked']);

/** SQL fragment: statuses that still need a student response (matches normalizeOfferStatus). */
export const OFFER_PENDING_STATUS_SQL = `LOWER(TRIM(o.status)) IN ('pending', 'offered', 'sent', 'awaiting_response', 'awaiting')`;

/**
 * @param {string | null | undefined} raw
 * @returns {'pending'|'accepted'|'rejected'|'expired'|'revoked'|string}
 */
export function normalizeOfferStatus(raw) {
  const s = String(raw || 'pending').trim().toLowerCase();
  if (s === 'declined' || s === 'decline' || s === 'reject' || s === 'rejected') return 'rejected';
  if (s === 'offered' || s === 'sent' || s === 'awaiting_response' || s === 'awaiting') return 'pending';
  if (VALID.has(s)) return s;
  return s;
}

/** Match a pending offer to a drive or program application row shown in My Applications. */
export function findPendingOfferForApplication(offers, application, { type } = {}) {
  if (!Array.isArray(offers) || !application) return null;
  const pending = offers.filter((o) => isPendingOfferStatus(o.status));
  if (!pending.length) return null;

  const driveId = application.drive_id || application.driveId;
  if (driveId) {
    const byDrive = pending.find((o) => String(o.driveId || o.drive_id || '') === String(driveId));
    if (byDrive) return byDrive;
  }

  const appId = application.id || application.applicationId;
  if (appId) {
    const byApp = pending.find((o) => String(o.applicationId || o.application_id || '') === String(appId));
    if (byApp) return byApp;
  }

  const company = String(application.company || application.companyName || '')
    .trim()
    .toLowerCase();
  const role = String(application.role || application.title || '')
    .trim()
    .toLowerCase();
  if (!company && !role) return null;

  return (
    pending.find((o) => {
      const oCompany = String(o.company || '').trim().toLowerCase();
      const oRole = String(o.role || '').trim().toLowerCase();
      if (company && oCompany && company !== oCompany) return false;
      if (role && oRole && role !== oRole) return false;
      return true;
    }) || null
  );
}

export function isPendingOfferStatus(raw) {
  return normalizeOfferStatus(raw) === 'pending';
}

/** True when the student can still accept or decline on My Offers. */
export function canStudentRespondToOffer(offer, now = new Date()) {
  if (!offer) return false;
  const status = normalizeOfferStatus(offer.status);
  if (status === 'expired') return false;
  if (status === 'pending' && isOfferDeadlinePassed(offer.deadline, now)) return false;
  return status === 'pending';
}
