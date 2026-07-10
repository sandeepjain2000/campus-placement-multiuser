import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { adminSettingsAuditSummary, validateAdminSettingsNormalized } from '@/lib/adminSettingsValidate';
import { getRequestClientIp, writeAuditLog } from '@/lib/auditLog';
import { query } from '@/lib/db';
import { invalidatePlatformSettingsCache, PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettings';
import { normalizeMarketingWebsiteUrl } from '@/lib/marketingWebsiteUrl';
import { canonicalizeTimezoneId } from '@/lib/timezoneUi';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




/** Respect explicit empty strings (e.g. clear platform name); only fall back when key absent or null. */
function pickString(payload, key, defaultVal) {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, key)) {
    return defaultVal;
  }
  const v = payload[key];
  if (v === null || v === undefined) return defaultVal;
  return String(v);
}

async function loadPlatformSettingsRow() {
  try {
    const res = await query(`SELECT settings FROM platform_settings WHERE id = 1`);
    const stored = res.rows[0]?.settings;
    const obj = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    return { ...PLATFORM_SETTINGS_DEFAULTS, ...obj };
  } catch {
    return { ...PLATFORM_SETTINGS_DEFAULTS };
  }
}

async function savePlatformSettingsRow(normalized) {
  await query(
    `INSERT INTO platform_settings (id, settings, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
    [JSON.stringify(normalized)],
  );
  invalidatePlatformSettingsCache();
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const merged = await loadPlatformSettingsRow();
    return NextResponse.json({
      ...merged,
      timezone: canonicalizeTimezoneId(merged.timezone),
    });
  } catch (error) {
    console.error('Failed to load admin settings:', error);
    return NextResponse.json({ error: 'Failed to load admin settings' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const normalized = {
      platformName: pickString(payload, 'platformName', PLATFORM_SETTINGS_DEFAULTS.platformName),
      marketingWebsiteUrl: normalizeMarketingWebsiteUrl(pickString(payload, 'marketingWebsiteUrl', '')),
      supportEmail: pickString(payload, 'supportEmail', PLATFORM_SETTINGS_DEFAULTS.supportEmail),
      supportPhone: pickString(payload, 'supportPhone', PLATFORM_SETTINGS_DEFAULTS.supportPhone),
      systemNotificationInboxEmail: pickString(
        payload,
        'systemNotificationInboxEmail',
        PLATFORM_SETTINGS_DEFAULTS.systemNotificationInboxEmail,
      ),
      systemNotificationWebmailUrl: pickString(
        payload,
        'systemNotificationWebmailUrl',
        PLATFORM_SETTINGS_DEFAULTS.systemNotificationWebmailUrl,
      ),
      systemNotificationSenderName: pickString(
        payload,
        'systemNotificationSenderName',
        PLATFORM_SETTINGS_DEFAULTS.systemNotificationSenderName,
      ),
      timezone: canonicalizeTimezoneId(pickString(payload, 'timezone', PLATFORM_SETTINGS_DEFAULTS.timezone)),
      requireEmailVerification: Boolean(payload?.requireEmailVerification),
      enableTwoFactorAuth: Boolean(payload?.enableTwoFactorAuth),
      sessionTimeoutValue: Number(payload?.sessionTimeoutValue || PLATFORM_SETTINGS_DEFAULTS.sessionTimeoutValue),
      sessionTimeoutUnit: String(payload?.sessionTimeoutUnit || PLATFORM_SETTINGS_DEFAULTS.sessionTimeoutUnit),
      rememberDeviceValue: Number(payload?.rememberDeviceValue || PLATFORM_SETTINGS_DEFAULTS.rememberDeviceValue),
      rememberDeviceUnit: String(payload?.rememberDeviceUnit || PLATFORM_SETTINGS_DEFAULTS.rememberDeviceUnit),
      smtpHost: String(payload?.smtpHost || ''),
      smtpPort: Number(payload?.smtpPort || PLATFORM_SETTINGS_DEFAULTS.smtpPort),
      fromEmail: String(payload?.fromEmail || ''),
      storageProvider: String(payload?.storageProvider ?? PLATFORM_SETTINGS_DEFAULTS.storageProvider),
      maxUploadSizeMb: Number(payload?.maxUploadSizeMb || PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb),
      sessionAdsEnabled: Boolean(payload?.sessionAdsEnabled),
    };

    const validation = validateAdminSettingsNormalized(normalized);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existing = await loadPlatformSettingsRow();
    await savePlatformSettingsRow(normalized);

    void writeAuditLog({
      userId: session.user.id,
      tenantId: null,
      action: 'UPDATE_ADMIN_SETTINGS',
      entityType: 'platform_settings',
      entityId: null,
      oldValues: { hadSettings: Boolean(existing && Object.keys(existing).length) },
      newValues: adminSettingsAuditSummary(normalized),
      ipAddress: getRequestClientIp(request),
    });

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save admin settings:', error);
    return NextResponse.json({ error: 'Failed to save admin settings' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_admin_settings' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
