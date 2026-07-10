import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';

/** Inbox where login-page support messages are delivered (YOPmail demo). */
export function resolveSupportInboxEmail(platform) {
  const inbox = String(platform?.systemNotificationInboxEmail || '').trim();
  if (inbox) return inbox;
  return String(platform?.supportEmail || PLATFORM_SETTINGS_DEFAULTS.supportEmail).trim();
}

export function resolveSupportPhone(platform) {
  const phone = String(platform?.supportPhone || '').trim();
  if (phone) return phone;
  return String(PLATFORM_SETTINGS_DEFAULTS.supportPhone || '').trim();
}

/** Link to read disposable inbox (YOPmail). */
export function resolveYopmailWebmailUrl(platform) {
  const custom = String(platform?.systemNotificationWebmailUrl || '').trim();
  if (custom) return custom;
  return 'https://yopmail.com/wm';
}

export function buildPublicSupportConfig(platform) {
  const inbox = resolveSupportInboxEmail(platform);
  return {
    supportEmail: String(platform?.supportEmail || PLATFORM_SETTINGS_DEFAULTS.supportEmail).trim(),
    supportPhone: resolveSupportPhone(platform),
    notificationInboxEmail: inbox,
    yopmailWebmailUrl: resolveYopmailWebmailUrl(platform),
  };
}
