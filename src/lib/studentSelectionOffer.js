import { normalizeAppStatus } from '@/lib/studentApplicationListTabs';
import { findPendingOfferForApplication, normalizeOfferStatus } from '@/lib/offerStatusNormalize';

/** @typedef {'not_selected'|'awaiting_formal_offer'|'formal_offer_pending'|'formal_offer_accepted'|'formal_offer_declined'|'formal_offer_other'} SelectionOfferKind */

/**
 * Match any offer row to an application (not only pending).
 * @param {Array<Record<string, unknown>> | null | undefined} offers
 * @param {Record<string, unknown> | null | undefined} application
 */
export function findOfferForApplication(offers, application, { type } = {}) {
  if (!Array.isArray(offers) || !application) return null;

  const appId = application.id || application.applicationId;
  if (appId) {
    const byApp = offers.find(
      (o) => String(o.applicationId || o.application_id || '') === String(appId),
    );
    if (byApp) return byApp;
  }

  const driveId = application.drive_id || application.driveId;
  if (driveId) {
    const byDrive = offers.find((o) => String(o.driveId || o.drive_id || '') === String(driveId));
    if (byDrive) return byDrive;
  }

  const pendingMatch = findPendingOfferForApplication(offers, application, { type });
  if (pendingMatch) return pendingMatch;

  const company = String(application.company || application.companyName || '')
    .trim()
    .toLowerCase();
  const role = String(application.role || application.title || '')
    .trim()
    .toLowerCase();
  if (!company && !role) return null;

  return (
    offers.find((o) => {
      const oCompany = String(o.company || '').trim().toLowerCase();
      const oRole = String(o.role || '').trim().toLowerCase();
      if (company && oCompany && company !== oCompany) return false;
      if (role && oRole && role !== oRole) return false;
      return true;
    }) || null
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} application
 * @param {Array<Record<string, unknown>> | null | undefined} offers
 * @returns {{ kind: SelectionOfferKind, offer: Record<string, unknown> | null }}
 */
export function resolveStudentSelectionOfferState(application, offers, options = {}) {
  if (normalizeAppStatus(application?.status) !== 'selected') {
    return { kind: 'not_selected', offer: null };
  }

  const offer = findOfferForApplication(offers, application, options);
  if (!offer) {
    return { kind: 'awaiting_formal_offer', offer: null };
  }

  const status = normalizeOfferStatus(offer.status);
  if (status === 'pending') return { kind: 'formal_offer_pending', offer };
  if (status === 'accepted') return { kind: 'formal_offer_accepted', offer };
  if (status === 'rejected') return { kind: 'formal_offer_declined', offer };
  return { kind: 'formal_offer_other', offer };
}

export function studentApplicationsHrefForType(type) {
  const t = String(type || 'drives');
  if (t === 'jobs') return '/dashboard/student/applications/jobs';
  if (t === 'internships') return '/dashboard/student/applications/internships';
  if (t === 'projects') return '/dashboard/student/applications/projects';
  if (t === 'hackathons') return '/dashboard/student/applications/hackathons';
  return '/dashboard/student/applications/drives';
}
