/** @typedef {'internship' | 'drive' | 'alumni_jobs'} OfferEventType */

export const OFFER_EVENT_TAB_IDS = ['internship', 'drive', 'alumni_jobs'];

/** @param {unknown} value */
export function normalizeOfferEventType(value) {
  const v = String(value || 'drive').toLowerCase().trim();
  if (v === 'internship' || v === 'drive' || v === 'alumni_jobs') return v;
  return 'drive';
}

/**
 * Classify an offer row for event-type tabs.
 * @param {{ offer_kind?: string, program_application_id?: string | null, drive_id?: string | null }} offer
 * @returns {OfferEventType}
 */
export function classifyOfferEventType(offer) {
  const kind = String(offer?.offer_kind || '').toLowerCase();
  if (kind === 'ppo_job' || kind === 'internship_offer' || offer?.program_application_id) return 'internship';
  if (offer?.drive_id) return 'drive';
  return 'alumni_jobs';
}

/**
 * @param {Array<{ eventType?: string, event_type?: string }>} templates
 * @param {OfferEventType} tab
 */
export function templateMatchesEventTab(template, tab) {
  const t = normalizeOfferEventType(template?.eventType ?? template?.event_type);
  return t === tab;
}

/**
 * @param {Array<unknown>} items
 * @param {(item: unknown) => OfferEventType} getType
 */
export function countOfferEventTypes(items, getType) {
  /** @type {Record<OfferEventType, number>} */
  const counts = { internship: 0, drive: 0, alumni_jobs: 0 };
  for (const item of items) {
    const key = getType(item);
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
  }
  return counts;
}
