/**
 * When creating or importing an offer row, set decision timestamps from terminal status.
 * Keeps student "My Offers" acceptance copy and reporting consistent.
 */
export function offerDecisionTimestampsForInsert(status) {
  const s = String(status || 'pending').toLowerCase();
  const t = new Date().toISOString();
  return {
    acceptedAt: s === 'accepted' ? t : null,
    rejectedAt: s === 'rejected' ? t : null,
  };
}
