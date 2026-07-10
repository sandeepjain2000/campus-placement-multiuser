/**
 * Build `IN ($n::uuid, ...)` for node-pg without relying on uuid[] array binding (some poolers mis-handle it).
 * @param {string[]} uuids
 * @param {number} startIndex - 1-based placeholder index for first uuid
 */
export function uuidInClause(uuids, startIndex) {
  const parts = uuids.map((_, i) => `$${startIndex + i}::uuid`);
  return { sql: parts.join(', '), params: uuids };
}
