/** Client-safe defaults (no DB). Server merges with `platform_settings` via platformSettings.js */
export const PLATFORM_SETTINGS_DEFAULTS = {
  platformName: 'PlacementHub',
  marketingWebsiteUrl: '',
  supportEmail: 'placementhub@yopmail.com',
  supportPhone: '+91 80000 12345',
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
  /** Dashboard sponsored banner (super admin → Platform Settings). */
  sessionAdsEnabled: false,
};

/** Max CSV upload size in bytes (client-side guard; server enforces separately). */
export const MAX_CSV_UPLOAD_BYTES = PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb * 1024 * 1024;
