const TIME_UNITS = new Set(['minutes', 'hours', 'days']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {object} n — normalized admin settings object (POST body after pickString/Number)
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateAdminSettingsNormalized(n) {
  if (!n || typeof n !== 'object') return { ok: false, error: 'Invalid payload' };

  if (String(n.platformName || '').length > 200) {
    return { ok: false, error: 'platformName must be at most 200 characters' };
  }

  const support = String(n.supportEmail || '').trim();
  if (!support) return { ok: false, error: 'supportEmail is required' };
  if (support.length > 320) return { ok: false, error: 'supportEmail too long' };
  if (!EMAIL_RE.test(support)) {
    return { ok: false, error: 'Invalid supportEmail' };
  }

  const sysInbox = String(n.systemNotificationInboxEmail ?? '').trim();
  if (sysInbox.length > 320) return { ok: false, error: 'systemNotificationInboxEmail too long' };
  if (sysInbox && !EMAIL_RE.test(sysInbox)) {
    return { ok: false, error: 'Invalid systemNotificationInboxEmail' };
  }

  const webmailUrl = String(n.systemNotificationWebmailUrl ?? '').trim();
  if (webmailUrl.length > 2048) return { ok: false, error: 'systemNotificationWebmailUrl too long' };

  const senderLabel = String(n.systemNotificationSenderName ?? '').trim();
  if (senderLabel.length > 120) return { ok: false, error: 'systemNotificationSenderName too long' };

  if (String(n.timezone || '').length > 120) {
    return { ok: false, error: 'timezone must be at most 120 characters' };
  }

  const stv = Number(n.sessionTimeoutValue);
  if (!Number.isFinite(stv) || stv < 1 || stv > 8760) {
    return { ok: false, error: 'sessionTimeoutValue must be between 1 and 8760' };
  }

  const stu = String(n.sessionTimeoutUnit || '');
  if (!TIME_UNITS.has(stu)) {
    return { ok: false, error: 'sessionTimeoutUnit must be minutes, hours, or days' };
  }

  const rdv = Number(n.rememberDeviceValue);
  if (!Number.isFinite(rdv) || rdv < 0 || rdv > 365) {
    return { ok: false, error: 'rememberDeviceValue must be between 0 and 365' };
  }

  const rdu = String(n.rememberDeviceUnit || '');
  if (!TIME_UNITS.has(rdu)) {
    return { ok: false, error: 'rememberDeviceUnit must be minutes, hours, or days' };
  }

  if (String(n.smtpHost || '').length > 255) {
    return { ok: false, error: 'smtpHost must be at most 255 characters' };
  }

  const port = Number(n.smtpPort);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'smtpPort must be between 1 and 65535' };
  }

  const from = String(n.fromEmail || '').trim();
  if (from.length > 320) return { ok: false, error: 'fromEmail too long' };
  if (from && !EMAIL_RE.test(from)) {
    return { ok: false, error: 'Invalid fromEmail' };
  }

  if (String(n.storageProvider || '').length > 120) {
    return { ok: false, error: 'storageProvider must be at most 120 characters' };
  }

  const maxMb = Number(n.maxUploadSizeMb);
  if (!Number.isFinite(maxMb) || maxMb < 1 || maxMb > 500) {
    return { ok: false, error: 'maxUploadSizeMb must be between 1 and 500' };
  }

  return { ok: true };
}

/**
 * Summary for audit logs (avoids persisting full SMTP host/email in new_values).
 * @param {object} n
 */
export function adminSettingsAuditSummary(n) {
  return {
    platformName: n.platformName,
    timezone: n.timezone,
    requireEmailVerification: n.requireEmailVerification,
    enableTwoFactorAuth: n.enableTwoFactorAuth,
    sessionTimeoutValue: n.sessionTimeoutValue,
    sessionTimeoutUnit: n.sessionTimeoutUnit,
    rememberDeviceValue: n.rememberDeviceValue,
    rememberDeviceUnit: n.rememberDeviceUnit,
    smtpConfigured: Boolean(String(n.smtpHost || '').trim() && Number(n.smtpPort) > 0),
    fromEmailSet: Boolean(String(n.fromEmail || '').trim()),
    storageProvider: n.storageProvider,
    maxUploadSizeMb: n.maxUploadSizeMb,
    systemInboxConfigured: Boolean(String(n.systemNotificationInboxEmail || '').trim()),
    webmailUrlSet: Boolean(String(n.systemNotificationWebmailUrl || '').trim()),
  };
}
