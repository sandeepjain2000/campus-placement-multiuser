/** Client-safe defaults (no DB). Server merges with `platform_settings` via platformSettings.js */
export const PLATFORM_SETTINGS_DEFAULTS = {
  platformName: 'PlacementHub',
  marketingWebsiteUrl: '',
  supportEmail: 'support.placementhub@placementhub.online',
  supportPhone: '+91 724 907 2620',
  /** Prefer a real monitored inbox — not a disposable public mailbox. */
  systemNotificationInboxEmail: 'support.placementhub@placementhub.online',
  systemNotificationWebmailUrl: '',
  systemNotificationSenderName: 'placementhub',
  timezone: 'Asia/Kolkata',
  requireEmailVerification: true,
  enableTwoFactorAuth: true,
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
  /**
   * When true, all outbound mail is forced to TEST_ENVIRONMENT_MAIL_RECIPIENTS
   * (ignores account/registration emails — protects email-provider bounce rate).
   * Default false so production-like hosts deliver to real recipients unless an admin opts in.
   */
  testEnvironment: false,
};

/** Fixed recipients when platform `testEnvironment` is Yes. */
export const TEST_ENVIRONMENT_MAIL_RECIPIENTS = [
  'placementhub@yopmail.com',
  'sandeepjain200019@gmail.com',
  'support.placementhub@placementhub.online',
];

/** Max CSV upload size in bytes (client-side guard; server enforces separately). */
export const MAX_CSV_UPLOAD_BYTES = PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb * 1024 * 1024;
