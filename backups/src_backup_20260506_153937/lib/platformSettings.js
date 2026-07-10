import { query } from '@/lib/db';

/** Defaults merged with DB `platform_settings.settings` (super admin /api/admin/settings). */
export const PLATFORM_SETTINGS_DEFAULTS = {
  platformName: 'PlacementHub',
  supportEmail: 'placementhub@yopmail.com',
  systemNotificationInboxEmail: 'placementhub@yopmail.com',
  systemNotificationWebmailUrl: 'https://yopmail.com/wm',
  systemNotificationSenderName: 'placementhub',
  timezone: 'Asia/Kolkata',
  requireEmailVerification: true,
  enableTwoFactorAuth: false,
  sessionTimeoutValue: 24,
  sessionTimeoutUnit: 'hours',
  rememberDeviceValue: 14,
  rememberDeviceUnit: 'days',
  smtpHost: '',
  smtpPort: 587,
  fromEmail: '',
  storageProvider: 'Local Filesystem',
  maxUploadSizeMb: 5,
};

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
    cache.data = { ...PLATFORM_SETTINGS_DEFAULTS, ...obj };
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
