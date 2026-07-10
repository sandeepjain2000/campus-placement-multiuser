'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

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
  const [platformName, setPlatformName] = useState('PlacementHub');
  const [supportEmail, setSupportEmail] = useState('support@placementhub.com');
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
  const [storageProvider, setStorageProvider] = useState('Local Filesystem');
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(5);

  const timezones = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
      try {
        const list = Intl.supportedValuesOf('timeZone');
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        // ignore and use fallback
      }
    }
    return FALLBACK_TIMEZONES;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        if (!mounted) return;
        setPlatformName(json.platformName ?? 'PlacementHub');
        setSupportEmail(json.supportEmail ?? 'support@placementhub.com');
        setTimezone(json.timezone ?? 'Asia/Kolkata');
        setRequireEmailVerification(Boolean(json.requireEmailVerification));
        setEnableTwoFactorAuth(Boolean(json.enableTwoFactorAuth));
        setSessionTimeoutValue(Number(json.sessionTimeoutValue ?? 24));
        setSessionTimeoutUnit(json.sessionTimeoutUnit ?? 'hours');
        setRememberDeviceValue(Number(json.rememberDeviceValue ?? 14));
        setRememberDeviceUnit(json.rememberDeviceUnit ?? 'days');
        setSmtpHost(json.smtpHost ?? '');
        setSmtpPort(Number(json.smtpPort ?? 587));
        setFromEmail(json.fromEmail ?? '');
        setStorageProvider(json.storageProvider ?? 'Local Filesystem');
        setMaxUploadSizeMb(Number(json.maxUploadSizeMb ?? 5));
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
    setSaving(true);
    try {
      const payload = {
        platformName,
        supportEmail,
        timezone,
        requireEmailVerification,
        enableTwoFactorAuth,
        sessionTimeoutValue,
        sessionTimeoutUnit,
        rememberDeviceValue,
        rememberDeviceUnit,
        smtpHost,
        smtpPort,
        fromEmail,
        storageProvider,
        maxUploadSizeMb,
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
          <p>Global configuration for PlacementHub</p>
        </div>
        <button className="btn btn-primary" onClick={saveSettings} disabled={loading || saving}>{saving ? 'Saving...' : '💾 Save'}</button>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">🌐 General</h3></div>
          <div className="form-group"><label className="form-label">Platform Name</label><input className="form-input" value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Support Email</label><input className="form-input" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Default Timezone</label>
            <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">🔐 Security</h3></div>
          <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={requireEmailVerification} onChange={(e) => setRequireEmailVerification(e.target.checked)} /> Require email verification</label></div>
          <div className="form-group"><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={enableTwoFactorAuth} onChange={(e) => setEnableTwoFactorAuth(e.target.checked)} /> Enable Two-Factor Auth</label></div>
          <div className="form-group">
            <label className="form-label">Session timeout</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                type="number"
                min={1}
                value={sessionTimeoutValue}
                onChange={(e) => setSessionTimeoutValue(Number(e.target.value || 1))}
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
              Prototype meaning: max signed-in session age before forced login.
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
          <div className="form-group"><label className="form-label">SMTP Host</label><input className="form-input" placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">SMTP Port</label><input className="form-input" type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value || 587))} /></div>
          <div className="form-group"><label className="form-label">From Email</label><input className="form-input" placeholder="noreply@placementhub.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">📦 Storage</h3></div>
          <div className="form-group"><label className="form-label">Storage Provider</label><select className="form-select" value={storageProvider} onChange={(e) => setStorageProvider(e.target.value)}><option>Local Filesystem</option><option>AWS S3</option><option>Supabase Storage</option></select></div>
          <div className="form-group"><label className="form-label">Max Upload Size (MB)</label><input className="form-input" type="number" value={maxUploadSizeMb} onChange={(e) => setMaxUploadSizeMb(Number(e.target.value || 5))} /></div>
        </div>
      </div>
    </div>
  );
}
