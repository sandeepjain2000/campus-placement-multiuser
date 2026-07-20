/**
 * Feature Ideas — college-facing product idea board.
 * Keep topics/statuses in sync with UI filters.
 */

export const FEATURE_IDEA_STATUSES = Object.freeze([
  'Pending approval',
  'Under consideration',
  'Planned',
  'In Development',
  'Shipped',
  'On Hold',
  'Not Planning',
]);

export const FEATURE_IDEA_TOPICS = Object.freeze([
  'New Feature',
  'Improvement',
  'UI/UX',
  'Integrations',
  'Bug Report',
  'Misc',
]);

export const FEATURE_IDEA_STATUS_TONE = Object.freeze({
  'Pending approval': 'badge-gray',
  'Under consideration': 'badge-gray',
  Planned: 'badge-blue',
  'In Development': 'badge-amber',
  Shipped: 'badge-green',
  'On Hold': 'badge-amber',
  'Not Planning': 'badge-gray',
});

export const MAX_FEATURE_IDEA_TITLE = 200;
export const MAX_FEATURE_IDEA_DESCRIPTION = 4000;
export const MAX_FEATURE_IDEA_TOPICS = 3;

export function normalizeFeatureIdeaTopics(input) {
  const raw = Array.isArray(input) ? input : [];
  const allowed = new Set(FEATURE_IDEA_TOPICS);
  const out = [];
  for (const t of raw) {
    const topic = String(t || '').trim();
    if (!allowed.has(topic) || out.includes(topic)) continue;
    out.push(topic);
    if (out.length >= MAX_FEATURE_IDEA_TOPICS) break;
  }
  return out;
}
