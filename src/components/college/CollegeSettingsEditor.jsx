'use client';

import { useEffect, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { useSession } from 'next-auth/react';
import { Award, Building2, Camera, Globe, LockKeyhole, MapPin, Save, Shield, UserCircle } from 'lucide-react';
import AcademicTaxonomySettingsPanel from '@/components/college/AcademicTaxonomySettingsPanel';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import EntityLogo from '@/components/EntityLogo';
import MobileHeader from '@/components/mobile/MobileHeader';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { validateImageFileContent } from '@/lib/inferImageContentType';
import { isBrowserLoadableAssetUrl } from '@/lib/clientAssetUrl';
import { pickBrowserAssetUrl } from '@/lib/resolveBrandLogoUrl';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';

const INITIAL_FORM = {
  website: '', logoUrl: '', websiteApi: '', placementSeasonLabel: '',
  social: { twitter: '', facebook: '', instagram: '', linkedin: '' },
  institution: { collegeName: '', email: '', communicationEmail: '', phone: '' },
  address: { address: '', city: '', state: '', pincode: '' },
  accreditation: { body: '', naacGrade: '', nirfRank: '' },
  institutionShowcase: {
    nbaAccreditedPrograms: '', nirfCategoryRanks: '', notableAlumni: '',
    patentCount: '', startupCount: '', incubationCells: '', researchCenters: '',
  },
  placementOfficer: { name: '', email: '', designation: '' },
  requireCvVerification: false,
  delegateCvVerificationToCommittee: false,
};

function TextField({ label, description, textarea = false, ...props }) {
  const Control = textarea ? Textarea : Input;
  return <Field><FieldLabel>{label}</FieldLabel><Control {...props} />{description ? <FieldDescription>{description}</FieldDescription> : null}</Field>;
}

function SectionCard({ icon: Icon, title, description, children, className }) {
  return <Card className={className}><CardHeader><CardTitle className="flex items-center gap-2"><Icon aria-hidden />{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</CardHeader><CardContent><FieldGroup>{children}</FieldGroup></CardContent></Card>;
}

function ToggleField({ checked, onCheckedChange, title, description, disabled }) {
  return <Field orientation="horizontal" data-disabled={disabled}><FieldLabel><Checkbox checked={Boolean(checked)} onCheckedChange={onCheckedChange} disabled={disabled} /><span><span className="block font-medium">{title}</span>{description ? <span className="text-muted-foreground text-sm font-normal">{description}</span> : null}</span></FieldLabel></Field>;
}

export default function CollegeSettingsEditor({ mobile = false }) {
  const { update: updateSession } = useSession();
  const { addToast } = useToast();
  const logoInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/college/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        if (mounted) setForm({
          ...INITIAL_FORM,
          ...json,
          social: { ...INITIAL_FORM.social, ...json.social },
          institution: { ...INITIAL_FORM.institution, ...json.institution },
          address: { ...INITIAL_FORM.address, ...json.address },
          accreditation: { ...INITIAL_FORM.accreditation, ...json.accreditation },
          institutionShowcase: { ...INITIAL_FORM.institutionShowcase, ...json.institutionShowcase },
          placementOfficer: { ...INITIAL_FORM.placementOfficer, ...json.placementOfficer },
          requireCvVerification: Boolean(json.requireCvVerification),
          delegateCvVerificationToCommittee: Boolean(json.delegateCvVerificationToCommittee),
        });
      } catch (error) {
        if (mounted) setMessage(error.message || 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setRoot = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setNested = (root, key, value) => setForm((previous) => ({ ...previous, [root]: { ...previous[root], [key]: value } }));
  const refreshBrandLogo = async (logoUrl) => {
    const safe = pickBrowserAssetUrl(logoUrl);
    await Promise.all([globalMutate('/api/college/settings'), safe ? updateSession?.({ brandLogoUrl: safe }) : updateSession?.({ brandLogoUrl: null })]);
  };

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const logoUrl = String(form.logoUrl || '').trim();
      if (logoUrl && !isBrowserLoadableAssetUrl(logoUrl)) throw new Error('Logo URL must be an https address or site path. Upload local files instead.');
      const res = await fetch('/api/college/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, logoUrl }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings');
      setForm((previous) => ({ ...previous, logoUrl }));
      await refreshBrandLogo(logoUrl);
      setMessage('Settings saved successfully.');
      addToast('Settings saved successfully.', 'success');
    } catch (error) {
      setMessage(error.message || 'Failed to save settings');
      addToast(error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const imageCheck = await validateImageFileContent(file);
    if (!imageCheck.ok || file.size > 2 * 1024 * 1024) {
      addToast(imageCheck.ok ? 'Logo image too large (max 2MB).' : imageCheck.error, 'warning');
      return;
    }
    setLogoUploading(true);
    try {
      const presignRes = await fetch('/api/college/settings/logo/presign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, contentType: imageCheck.contentType, fileSize: file.size }) });
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presign?.error || 'Could not start upload.');
      const headers = presign.contentType ? { 'Content-Type': String(presign.contentType).split(';')[0].trim() } : {};
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers, body: file });
      if (!putRes.ok) throw new Error(`Upload to storage failed (HTTP ${putRes.status}).`);
      const completeRes = await fetch('/api/college/settings/logo/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_url: presign.fileUrl }) });
      const complete = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) throw new Error(complete?.error || 'Failed to save uploaded logo.');
      const nextLogoUrl = String(presign.fileUrl || '').trim();
      setForm((previous) => ({ ...previous, logoUrl: nextLogoUrl || previous.logoUrl }));
      await refreshBrandLogo(nextLogoUrl);
      addToast('College logo updated.', 'success');
      appendClientDebugLog({ source: mobile ? 'college_settings_logo_mobile' : 'college_settings_logo', action: 'success', fileUrl: nextLogoUrl });
    } catch (error) {
      addToast(error.message || 'Logo upload failed', 'error');
      appendClientDebugLog({ source: mobile ? 'college_settings_logo_mobile' : 'college_settings_logo', action: 'error', message: error.message });
    } finally {
      setLogoUploading(false);
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    const validation = !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword
      ? 'Please fill all password fields.'
      : getPasswordValidationError(passwordForm.newPassword) || (passwordForm.newPassword !== passwordForm.confirmPassword ? 'New password and confirmation do not match.' : '');
    if (validation) {
      addToast(validation, 'warning');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to change password');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast('Password updated successfully.', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const saveButton = <Button size={mobile ? 'sm' : 'default'} onClick={onSave} disabled={saving || loading}><Save data-icon="inline-start" />{saving ? 'Saving…' : 'Save changes'}</Button>;
  const text = (root, key, label, props = {}) => <TextField label={label} value={form[root][key]} onChange={(event) => setNested(root, key, event.target.value)} {...props} />;

  const content = loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((key) => <div key={key} className="bg-muted h-64 animate-pulse rounded-xl" />)}</div> : (
    <>
      {message ? <Alert variant={message.includes('successfully') ? 'default' : 'destructive'}><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile"><Building2 />Profile</TabsTrigger>
          <TabsTrigger value="academics"><Award />Academics</TabsTrigger>
          <TabsTrigger value="showcase"><Shield />Showcase</TabsTrigger>
          <TabsTrigger value="web"><Globe />Web &amp; social</TabsTrigger>
          <TabsTrigger value="security"><LockKeyhole />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5 grid gap-5 lg:grid-cols-2">
          <SectionCard icon={Building2} title="Institution details">
            <div className="flex flex-wrap items-center gap-4">
              <EntityLogo name={form.institution.collegeName || 'College'} logoUrl={form.logoUrl} website={form.website} size="lg" shape="rounded" />
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={logoUploading} onChange={onLogoChange} />
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}><Camera data-icon="inline-start" />{logoUploading ? 'Uploading…' : 'Upload college logo'}</Button>
            </div>
            {text('institution', 'collegeName', 'College name')}
            <TextField label="Academic year (display override)" placeholder="e.g. 2025-26" value={form.placementSeasonLabel} onChange={(event) => setRoot('placementSeasonLabel', event.target.value)} description="Optional legacy override; the top bar otherwise uses the current academic year." />
            {text('institution', 'email', 'Primary email', { type: 'email' })}
            {text('institution', 'communicationEmail', 'Communication email', { type: 'email', description: 'Used for employer coordination and system mail when different from the primary email.' })}
            {text('institution', 'phone', 'Phone')}
          </SectionCard>
          <SectionCard icon={MapPin} title="Address">
            {text('address', 'address', 'Street address', { textarea: true, rows: 3 })}
            {text('address', 'city', 'City')}
            {text('address', 'state', 'State')}
            {text('address', 'pincode', 'Pincode')}
          </SectionCard>
          <SectionCard icon={UserCircle} title="Placement officer">
            {text('placementOfficer', 'name', 'Name')}
            {text('placementOfficer', 'email', 'Email', { type: 'email' })}
            {text('placementOfficer', 'designation', 'Designation', { placeholder: 'Training & Placement Officer' })}
          </SectionCard>
          <SectionCard icon={Shield} title="CV verification">
            <ToggleField checked={form.requireCvVerification} onCheckedChange={(v) => setForm((previous) => ({ ...previous, requireCvVerification: !!v, delegateCvVerificationToCommittee: v ? previous.delegateCvVerificationToCommittee : false }))} title="Require verified CV for drives and internships" description="Each uploaded CV can be verified from the student profile." />
            <ToggleField checked={form.delegateCvVerificationToCommittee} disabled={!form.requireCvVerification} onCheckedChange={(v) => setRoot('delegateCvVerificationToCommittee', !!v)} title="Delegate verification to Placement Committee" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="academics" className="mt-5 flex flex-col gap-5">
          <AcademicTaxonomySettingsPanel />
          <SectionCard icon={Award} title="Accreditation">
            {text('accreditation', 'body', 'Accreditation body')}
            <Field><FieldLabel>NAAC grade</FieldLabel><AdminFilterSelect className="w-full" value={form.accreditation.naacGrade} onValueChange={(v) => setNested('accreditation', 'naacGrade', v)} items={[{ label: 'Not specified', value: 'all' }, ...['A++', 'A+', 'A', 'B++', 'B+', 'B'].map((grade) => ({ label: grade, value: grade }))]} /></Field>
            <Field><FieldLabel>NIRF rank</FieldLabel><ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_NIRF_RANK} value={form.accreditation.nirfRank} onChange={(value) => setNested('accreditation', 'nirfRank', value)} /></Field>
          </SectionCard>
        </TabsContent>

        <TabsContent value="showcase" className="mt-5">
          <SectionCard icon={Shield} title="Institution showcase" description="Rankings, alumni outcomes, innovation, startups, patents, and research centers.">
            {text('institutionShowcase', 'nbaAccreditedPrograms', 'NBA accredited programs')}
            {text('institutionShowcase', 'nirfCategoryRanks', 'NIRF category ranks')}
            {text('institutionShowcase', 'notableAlumni', 'Notable alumni', { textarea: true, rows: 3 })}
            <Field><FieldLabel>Total patents</FieldLabel><ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_PATENT_COUNT} context={{ label: 'Patent count' }} value={form.institutionShowcase.patentCount} onChange={(value) => setNested('institutionShowcase', 'patentCount', value)} /></Field>
            <Field><FieldLabel>Startups incubated</FieldLabel><ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_STARTUP_COUNT} context={{ label: 'Startup count' }} value={form.institutionShowcase.startupCount} onChange={(value) => setNested('institutionShowcase', 'startupCount', value)} /></Field>
            {text('institutionShowcase', 'incubationCells', 'Incubation cells / entrepreneurship hubs')}
            {text('institutionShowcase', 'researchCenters', 'Research centers of excellence')}
          </SectionCard>
        </TabsContent>

        <TabsContent value="web" className="mt-5">
          <SectionCard icon={Globe} title="Website and social profiles">
            <TextField label="Public website URL" type="url" value={form.website} onChange={(event) => setRoot('website', event.target.value)} />
            <TextField label="Logo URL (optional)" inputMode="url" value={form.logoUrl} onChange={(event) => setRoot('logoUrl', event.target.value)} />
            <TextField label="Website API base URL" type="url" value={form.websiteApi} onChange={(event) => setRoot('websiteApi', event.target.value)} />
            {text('social', 'twitter', 'Twitter / X URL', { type: 'url' })}
            {text('social', 'facebook', 'Facebook URL', { type: 'url' })}
            {text('social', 'instagram', 'Instagram URL', { type: 'url' })}
            {text('social', 'linkedin', 'LinkedIn URL', { type: 'url' })}
          </SectionCard>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <SectionCard icon={LockKeyhole} title="Password" description="Change the password used to sign in to this college account.">
            <form onSubmit={onChangePassword}><FieldGroup>
              <TextField label="Current password" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((previous) => ({ ...previous, currentPassword: event.target.value }))} />
              <TextField label="New password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))} description={PASSWORD_REQUIREMENTS_HINT} />
              <TextField label="Confirm new password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))} />
              <Button type="submit" disabled={passwordSaving}>{passwordSaving ? 'Updating…' : 'Update password'}</Button>
            </FieldGroup></form>
          </SectionCard>
        </TabsContent>
      </Tabs>
      {mobile ? <div className="mt-5">{saveButton}</div> : null}
    </>
  );

  const main = <main className="flex flex-col gap-6 pb-12">{!mobile ? <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-muted-foreground text-sm font-medium">College administration</p><h1 className="font-heading text-3xl font-semibold tracking-tight">Settings</h1><p className="text-muted-foreground mt-1">Institution profile, academic defaults, branding, and account security.</p></div>{saveButton}</header> : null}{content}</main>;
  return mobile ? <><MobileHeader title="Settings" action={saveButton} /><div className="px-4 pb-20 pt-4">{main}</div></> : main;
}
