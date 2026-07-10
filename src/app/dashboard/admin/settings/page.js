'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { buildSortedTimezoneIds, canonicalizeTimezoneId } from '@/lib/timezoneUi';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateAdminSettingsPayload } from '@/lib/apiInputValidation';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Tokyo',
];

export default function AdminSettingsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [marketingWebsiteUrl, setMarketingWebsiteUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [enableTwoFactorAuth, setEnableTwoFactorAuth] = useState(false);
  const [sessionTimeoutValue, setSessionTimeoutValue] = useState(24);
  const [sessionTimeoutUnit, setSessionTimeoutUnit] = useState('hours');
  const [rememberDeviceValue, setRememberDeviceValue] = useState(14);
  const [rememberDeviceUnit, setRememberDeviceUnit] = useState('days');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [fromEmail, setFromEmail] = useState('');
  const [systemNotificationInboxEmail, setSystemNotificationInboxEmail] = useState('');
  const [systemNotificationWebmailUrl, setSystemNotificationWebmailUrl] = useState('');
  const [systemNotificationSenderName, setSystemNotificationSenderName] = useState('');
  const [storageProvider, setStorageProvider] = useState('');
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(5);
  const [sessionAdsEnabled, setSessionAdsEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');

  const timezones = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
      try {
        const list = Intl.supportedValuesOf('timeZone');
        if (Array.isArray(list) && list.length > 0) return buildSortedTimezoneIds(list);
      } catch {
        // ignore and use fallback
      }
    }
    return buildSortedTimezoneIds(FALLBACK_TIMEZONES);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        if (!mounted) return;
        setPlatformName(json.platformName ?? '');
        setMarketingWebsiteUrl(json.marketingWebsiteUrl ?? '');
        setSupportEmail(json.supportEmail ?? '');
        setSupportPhone(json.supportPhone ?? '');
        setTimezone(
          canonicalizeTimezoneId(
            json.timezone ?? 'Asia/Kolkata'
          ),
        );
        setRequireEmailVerification(Boolean(json.requireEmailVerification));
        setEnableTwoFactorAuth(Boolean(json.enableTwoFactorAuth));
        setSessionTimeoutValue(Number(json.sessionTimeoutValue ?? 24));
        setSessionTimeoutUnit(json.sessionTimeoutUnit ?? 'hours');
        setRememberDeviceValue(Number(json.rememberDeviceValue ?? 14));
        setRememberDeviceUnit(json.rememberDeviceUnit ?? 'days');
        setSmtpHost(json.smtpHost ?? '');
        setSmtpPort(Number(json.smtpPort ?? 587));
        setFromEmail(json.fromEmail ?? '');
        setSystemNotificationInboxEmail(json.systemNotificationInboxEmail ?? '');
        setSystemNotificationWebmailUrl(json.systemNotificationWebmailUrl ?? '');
        setSystemNotificationSenderName(json.systemNotificationSenderName ?? '');
        setStorageProvider(json.storageProvider ?? '');
        setMaxUploadSizeMb(Number(json.maxUploadSizeMb ?? 5));
        setSessionAdsEnabled(Boolean(json.sessionAdsEnabled));
      } catch (e) {
        addToast(e.message || 'Failed to load settings', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [addToast]);

  const saveSettings = async () => {
    const settingsErr = validateAdminSettingsPayload({
      sessionTimeoutValue,
      smtpPort,
      maxUploadSizeMb,
    });
    if (settingsErr) {
      addToast(settingsErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        platformName,
        marketingWebsiteUrl,
        supportEmail,
        supportPhone,
        timezone: canonicalizeTimezoneId(timezone),
        requireEmailVerification,
        enableTwoFactorAuth,
        sessionTimeoutValue,
        sessionTimeoutUnit,
        rememberDeviceValue,
        rememberDeviceUnit,
        smtpHost,
        smtpPort,
        fromEmail,
        systemNotificationInboxEmail,
        systemNotificationWebmailUrl,
        systemNotificationSenderName,
        storageProvider,
        maxUploadSizeMb,
        sessionAdsEnabled,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings');
      addToast('Platform settings saved successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = () => {
    const payload = {
      platformName,
      marketingWebsiteUrl,
      supportEmail,
      supportPhone,
      timezone: canonicalizeTimezoneId(timezone),
      requireEmailVerification,
      enableTwoFactorAuth,
      sessionTimeoutValue,
      sessionTimeoutUnit,
      rememberDeviceValue,
      rememberDeviceUnit,
      smtpHost,
      smtpPort,
      fromEmail,
      systemNotificationInboxEmail,
      systemNotificationWebmailUrl,
      systemNotificationSenderName,
      storageProvider,
      maxUploadSizeMb,
      sessionAdsEnabled,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'platform-settings-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Settings exported.', 'info');
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage('Please fill all password fields.');
      return;
    }
    const passwordErr = getPasswordValidationError(passwordForm.newPassword);
    if (passwordErr) {
      setPasswordMessage(passwordErr);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update password');
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e2) {
      setPasswordMessage(e2.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-card" style={{ height: 220, marginTop: '1rem' }} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>⚙️ Platform Settings</h1>
          <p>Global platform configuration</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={exportSettings} disabled={loading || saving}>Export JSON</button>
          <button type="button" className="btn btn-primary" onClick={saveSettings} disabled={loading || saving}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">🌐 General</h3></div>
          <div className="form-group"><label className="form-label">Platform Name</label><input className="form-input" placeholder="Set platform name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Public marketing website</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://example.com/placementhub"
              value={marketingWebsiteUrl}
              onChange={(e) => setMarketingWebsiteUrl(e.target.value)}
            />
            <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
              Reserved for a future external brochure site. Landing nav links <strong>Features</strong>, <strong>About</strong>, and <strong>Contact</strong> always open the built-in pages <code>/features</code>, <code>/about</code>, and <code>/contact</code>. Support email and phone on <code>/contact</code> come from the fields below.
            </p>
          </div>
          <div className="form-group"><label className="form-label">Support Email</label><input className="form-input" placeholder="Set support email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Support phone (login page)</label>
            <input
              className="form-input"
              type="tel"
              placeholder="+91 80000 12345"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
            />
            <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
              Shown on the public login page with a click-to-call link.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Default Timezone</label>
            <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={sessionAdsEnabled}
                onChange={(e) => setSessionAdsEnabled(e.target.checked)}
              />
              Show sponsored banner in dashboard
            </label>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
              Rotating sponsored message at the top of signed-in dashboards. Off by default.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">🔐 Security</h3></div>
          <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={requireEmailVerification} onChange={(e) => setRequireEmailVerification(e.target.checked)} /> Require email verification</label></div>
          <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={enableTwoFactorAuth} onChange={(e) => setEnableTwoFactorAuth(e.target.checked)} /> Enable Two-Factor Auth</label></div>
          <div className="form-group">
            <label className="form-label">Session timeout</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.ADMIN_SESSION_TIMEOUT}
                value={sessionTimeoutValue}
                onChange={(v) => setSessionTimeoutValue(v === '' ? 1 : Number(v))}
              />
              <select
                className="form-select"
                value={sessionTimeoutUnit}
                onChange={(e) => setSessionTimeoutUnit(e.target.value)}
                style={{ maxWidth: 160 }}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
              Max signed-in time while the browser stays open (default 24 hours). Closing the browser always ends the session; this does not enable “remember me” across restarts.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Trusted device window (for future 2FA)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                type="number"
                min={1}
                value={rememberDeviceValue}
                onChange={(e) => setRememberDeviceValue(Number(e.target.value || 1))}
              />
              <select
                className="form-select"
                value={rememberDeviceUnit}
                onChange={(e) => setRememberDeviceUnit(e.target.value)}
                style={{ maxWidth: 160 }}
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
            <p className="text-xs text-tertiary" style={{ marginTop: '0.35rem' }}>
              This will control when a known device should require 2FA again (future behavior).
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">📧 Email Configuration</h3></div>
          <p className="text-xs text-tertiary" style={{ marginBottom: '0.75rem' }}>
            Outbound mail uses your SMTP environment. The system notification inbox is where operational emails are delivered (links, drive events, etc.); leave blank to fall back to support email only.
          </p>
          <div className="form-group">
            <label className="form-label">System notification inbox</label>
            <input
              className="form-input"
              type="email"
              placeholder="placementhub@yopmail.com"
              value={systemNotificationInboxEmail}
              onChange={(e) => setSystemNotificationInboxEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Webmail / inbox URL (for staff)</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://yopmail.com/wm"
              value={systemNotificationWebmailUrl}
              onChange={(e) => setSystemNotificationWebmailUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sender display name</label>
            <input
              className="form-input"
              placeholder="placementhub"
              value={systemNotificationSenderName}
              onChange={(e) => setSystemNotificationSenderName(e.target.value)}
            />
          </div>
          <div className="form-group"><label className="form-label">SMTP Host</label><input className="form-input" placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">SMTP Port</label><ValidatedNumberInput fieldId={FIELD_IDS.ADMIN_SMTP_PORT} value={smtpPort} onChange={(v) => setSmtpPort(v === '' ? 587 : Number(v))} /></div>
          <div className="form-group"><label className="form-label">From Email</label><input className="form-input" placeholder="noreply@placementhub.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">📦 Storage</h3></div>
          <div className="form-group"><label className="form-label">Storage Provider</label><select className="form-select" value={storageProvider} onChange={(e) => setStorageProvider(e.target.value)}><option value="">Select storage provider</option><option>Local Filesystem</option><option>AWS S3</option><option>Supabase Storage</option></select></div>
          <div className="form-group"><label className="form-label">Max Upload Size (MB)</label><ValidatedNumberInput fieldId={FIELD_IDS.ADMIN_MAX_UPLOAD_MB} value={maxUploadSizeMb} onChange={(v) => setMaxUploadSizeMb(v === '' ? 5 : Number(v))} /></div>
        </div>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><h3 className="card-title">🔐 Change Password</h3></div>
          <form onSubmit={updatePassword}>
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Current password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
                <span className="form-hint">{PASSWORD_REQUIREMENTS_HINT}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm new password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-secondary" disabled={passwordSaving}>
                {passwordSaving ? 'Updating...' : 'Update password'}
              </button>
              {passwordMessage ? <span className="text-sm text-secondary">{passwordMessage}</span> : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
