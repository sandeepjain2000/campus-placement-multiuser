import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';

export const PLACEMENTHUB_SUPPORT_PHONE = '+91 724 907 2620';
export const PLACEMENTHUB_SUPPORT_EMAIL = 'support.placementhub@placementhub.online';
/** Extra inbox for the login Contact support form. Same Gmail mailbox as the dotted form. */
export const PLACEMENTHUB_SUPPORT_GMAIL = 'placementhubsupport@gmail.com';

/** Login support goes to the configured inbox and also to the Gmail above. */
export function supportMessageRecipients(inbox) {
  const primary = String(inbox || '').trim();
  const copy = PLACEMENTHUB_SUPPORT_GMAIL;
  if (!primary) return [copy];
  if (primary.toLowerCase() === copy.toLowerCase()) return [primary];
  return [primary, copy];
}

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
