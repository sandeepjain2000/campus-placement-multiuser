'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { buildSortedTimezoneIds, canonicalizeTimezoneId } from '@/lib/timezoneUi';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateAdminSettingsPayload } from '@/lib/apiInputValidation';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';

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
  const [testEnvironment, setTestEnvironment] = useState(true);
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
        setTestEnvironment(json.testEnvironment !== false);
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
        testEnvironment,
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
      testEnvironment,
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
      <Card><CardHeader><CardTitle>Platform settings</CardTitle><CardDescription>Loading configuration…</CardDescription></CardHeader></Card>
    );
  }

  const selectClass = 'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3';
  const numberClass = 'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3';
  const ToggleField = ({ id, label, description, checked, onCheckedChange }) => (
    <Field orientation="horizontal">
      <div className="flex flex-1 flex-col gap-1">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>
      <Checkbox id={id} checked={Boolean(checked)} onCheckedChange={onCheckedChange} />
    </Field>
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Global platform, security, email, and storage configuration</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportSettings} disabled={saving}>Export JSON</Button>
          <Button type="button" onClick={saveSettings} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </div>
      <Tabs defaultValue="general">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger><TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card><CardHeader><CardTitle>General</CardTitle><CardDescription>Public identity, support channels, and dashboard options.</CardDescription></CardHeader>
            <CardContent><FieldGroup>
              <Field><FieldLabel htmlFor="platform-name">Platform name</FieldLabel><Input id="platform-name" placeholder="Set platform name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></Field>
              <Field><FieldLabel htmlFor="marketing-url">Public marketing website</FieldLabel><Input id="marketing-url" type="url" placeholder="https://example.com/placementhub" value={marketingWebsiteUrl} onChange={(e) => setMarketingWebsiteUrl(e.target.value)} /><FieldDescription>Reserved for a future external brochure site. Built-in Features, About, and Contact routes remain unchanged.</FieldDescription></Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field><FieldLabel htmlFor="support-email">Support email</FieldLabel><Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></Field>
                <Field><FieldLabel htmlFor="support-phone">Support phone</FieldLabel><Input id="support-phone" type="tel" placeholder="+91 80000 12345" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} /><FieldDescription>Shown on the public login page.</FieldDescription></Field>
              </div>
              <Field><FieldLabel htmlFor="timezone">Default timezone</FieldLabel><AdminFilterSelect id="timezone" className={selectClass} value={timezone} emptyMapsToAll={false} onValueChange={setTimezone} items={timezones.map((tz) => ({ label: tz, value: tz }))} /></Field>
              <ToggleField id="session-ads" label="Show sponsored banner in dashboard" description="Rotating sponsored message at the top of signed-in dashboards." checked={sessionAdsEnabled} onCheckedChange={(v) => setSessionAdsEnabled(!!v)} />
            </FieldGroup></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card><CardHeader><CardTitle>Security</CardTitle><CardDescription>Authentication requirements and session lifetimes.</CardDescription></CardHeader>
            <CardContent><FieldGroup>
              <ToggleField id="require-verification" label="Require email verification" checked={requireEmailVerification} onCheckedChange={(v) => setRequireEmailVerification(!!v)} />
              <ToggleField id="enable-2fa" label="Enable two-factor authentication" checked={enableTwoFactorAuth} onCheckedChange={(v) => setEnableTwoFactorAuth(!!v)} />
              <Field><FieldLabel>Session timeout</FieldLabel><div className="grid gap-2 sm:grid-cols-[1fr_10rem]"><ValidatedNumberInput className={numberClass} fieldId={FIELD_IDS.ADMIN_SESSION_TIMEOUT} value={sessionTimeoutValue} onChange={(v) => setSessionTimeoutValue(v === '' ? 1 : Number(v))} /><AdminFilterSelect className={selectClass} value={sessionTimeoutUnit} emptyMapsToAll={false} onValueChange={setSessionTimeoutUnit} items={[{ label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }, { label: 'Weeks', value: 'weeks' }]} /></div><FieldDescription>Maximum signed-in time while the browser remains open.</FieldDescription></Field>
              <Field><FieldLabel htmlFor="remember-device">Trusted device window</FieldLabel><div className="grid gap-2 sm:grid-cols-[1fr_10rem]"><Input id="remember-device" type="number" min={1} value={rememberDeviceValue} onChange={(e) => setRememberDeviceValue(Number(e.target.value || 1))} /><AdminFilterSelect className={selectClass} value={rememberDeviceUnit} emptyMapsToAll={false} onValueChange={setRememberDeviceUnit} items={[{ label: 'Days', value: 'days' }, { label: 'Weeks', value: 'weeks' }]} /></div><FieldDescription>Future 2FA trusted-device duration.</FieldDescription></Field>
            </FieldGroup></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="email">
          <Card><CardHeader><CardTitle>Email configuration</CardTitle><CardDescription>ZeptoMail/SMTP delivery and safe test routing.</CardDescription></CardHeader>
            <CardContent><FieldGroup>
              <Alert><AlertDescription>Test mode sends every message only to the configured safe inboxes.</AlertDescription></Alert>
              <Field><FieldLabel htmlFor="test-environment">Test environment</FieldLabel><AdminFilterSelect id="test-environment" className={selectClass} value={testEnvironment ? 'Yes' : 'No'} emptyMapsToAll={false} onValueChange={(v) => setTestEnvironment(v === 'Yes')} items={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]} /><FieldDescription>Yes routes mail to placementhub@yopmail.com and sandeepjain200019@gmail.com; No uses the real recipient.</FieldDescription></Field>
              <Field><FieldLabel htmlFor="notification-inbox">System notification inbox</FieldLabel><Input id="notification-inbox" type="email" placeholder="placementhub@yopmail.com" value={systemNotificationInboxEmail} onChange={(e) => setSystemNotificationInboxEmail(e.target.value)} /></Field>
              <Field><FieldLabel htmlFor="webmail-url">Webmail / inbox URL</FieldLabel><Input id="webmail-url" type="url" placeholder="https://yopmail.com/wm" value={systemNotificationWebmailUrl} onChange={(e) => setSystemNotificationWebmailUrl(e.target.value)} /></Field>
              <Field><FieldLabel htmlFor="sender-name">Sender display name</FieldLabel><Input id="sender-name" placeholder="placementhub" value={systemNotificationSenderName} onChange={(e) => setSystemNotificationSenderName(e.target.value)} /></Field>
              <div className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor="smtp-host">SMTP host</FieldLabel><Input id="smtp-host" placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} /></Field><Field><FieldLabel>SMTP port</FieldLabel><ValidatedNumberInput className={numberClass} fieldId={FIELD_IDS.ADMIN_SMTP_PORT} value={smtpPort} onChange={(v) => setSmtpPort(v === '' ? 587 : Number(v))} /></Field></div>
              <Field><FieldLabel htmlFor="from-email">From email</FieldLabel><Input id="from-email" type="email" placeholder="noreply@placementhub.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></Field>
            </FieldGroup></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="storage">
          <Card><CardHeader><CardTitle>Storage</CardTitle><CardDescription>Upload provider and file-size policy.</CardDescription></CardHeader>
            <CardContent><FieldGroup><Field><FieldLabel htmlFor="storage-provider">Storage provider</FieldLabel><AdminFilterSelect id="storage-provider" className={selectClass} value={storageProvider} emptyMapsToAll={false} onValueChange={setStorageProvider} items={[{ label: 'Select storage provider', value: '' }, { label: 'Local Filesystem', value: 'Local Filesystem' }, { label: 'AWS S3', value: 'AWS S3' }, { label: 'Supabase Storage', value: 'Supabase Storage' }]} /></Field><Field><FieldLabel>Max upload size (MB)</FieldLabel><ValidatedNumberInput className={numberClass} fieldId={FIELD_IDS.ADMIN_MAX_UPLOAD_MB} value={maxUploadSizeMb} onChange={(v) => setMaxUploadSizeMb(v === '' ? 5 : Number(v))} /></Field></FieldGroup></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <form onSubmit={updatePassword}><Card><CardHeader><CardTitle>Change password</CardTitle><CardDescription>Update the password for your administrator account.</CardDescription></CardHeader>
            <CardContent><FieldGroup>
              <Field><FieldLabel htmlFor="current-password">Current password</FieldLabel><Input id="current-password" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
              <Field><FieldLabel htmlFor="new-password">New password</FieldLabel><Input id="new-password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} /><FieldDescription>{PASSWORD_REQUIREMENTS_HINT}</FieldDescription></Field>
              <Field><FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel><Input id="confirm-password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} /></Field>
              {passwordMessage ? <Alert><AlertDescription>{passwordMessage}</AlertDescription></Alert> : null}
            </FieldGroup></CardContent>
            <CardFooter className="border-t"><Button type="submit" variant="outline" disabled={passwordSaving}>{passwordSaving ? 'Updating…' : 'Update password'}</Button></CardFooter>
          </Card></form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
