import { query } from '@/lib/db';
import { canonicalizeTimezoneId } from '@/lib/timezoneUi';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';

export { PLATFORM_SETTINGS_DEFAULTS };

let cache = { at: 0, data: null };
const TTL_MS = 30_000;

/**
 * @returns {Promise<typeof PLATFORM_SETTINGS_DEFAULTS & Record<string, unknown>>}
 */
export async function getPlatformSettings() {
  if (Date.now() - cache.at < TTL_MS && cache.data) {
    return cache.data;
  }
  try {
    const r = await query('SELECT settings FROM platform_settings WHERE id = 1');
    const stored = r.rows[0]?.settings;
    const obj = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const merged = { ...PLATFORM_SETTINGS_DEFAULTS, ...obj };
    merged.timezone = canonicalizeTimezoneId(merged.timezone);
    cache.data = merged;
  } catch {
    cache.data = { ...PLATFORM_SETTINGS_DEFAULTS };
  }
  cache.at = Date.now();
  return cache.data;
}

export function invalidatePlatformSettingsCache() {
  cache.at = 0;
  cache.data = null;
}
