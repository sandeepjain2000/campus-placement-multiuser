'use client';
import { useMemo, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import EntityLogo from '@/components/EntityLogo';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { validateImageFileContent } from '@/lib/inferImageContentType';
import { pickBrowserAssetUrl } from '@/lib/resolveBrandLogoUrl';
import { DEFAULT_ENTITY_LOGO_URL } from '@/lib/clientAssetUrl';
import {
  EMPLOYER_COMPANY_TYPE_OPTIONS,
  EMPLOYER_COMPANY_SIZE_OPTIONS,
  labelEmployerCompanyType,
} from '@/lib/employerCompanyTypeLabels';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Building2, Phone, MapPin, FileText, Pencil, GraduationCap, Star, Users, ExternalLink, Mail, Camera } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load profile');
  return json;
};

export default function EmployerProfilePage() {
  const [editing, setEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const { addToast } = useToast();
  const { update: updateSession } = useSession();
  const { data, error, mutate } = useSWR('/api/employer/profile', fetcher);
  const [form, setForm] = useState(null);

  const profile = useMemo(() => {
    const p = data?.profile || {};
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');
    const numOrNull = (v) => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      companyName: str(p.company_name),
      companyNameRaw: (p.company_name != null && String(p.company_name).trim() !== '') ? String(p.company_name).trim() : '',
      industry: str(p.industry),
      companyTypeLabel: labelEmployerCompanyType(p.company_type),
      companySize: str(p.company_size),
      founded: p.founded_year != null && String(p.founded_year).trim() !== '' ? String(p.founded_year) : '—',
      industryRaw: (p.industry && String(p.industry).trim()) || '',
      companyTypeRaw: (p.company_type && String(p.company_type).trim()) || '',
      companySizeRaw: (p.company_size && String(p.company_size).trim()) || '',
      foundedRaw: p.founded_year != null ? String(p.founded_year) : '',
      logoUrl: pickBrowserAssetUrl(p.logo_url) || '',
      website: p.website != null && String(p.website).trim() !== '' ? String(p.website).trim() : '',
      headquarters: str(p.headquarters),
      locations: Array.isArray(p.locations) ? p.locations : [],
      description: str(p.description),
      contactPerson: str(p.contact_person),
      contactEmail: str(p.contact_email),
      contactPhone: str(p.contact_phone),
      accountEmail:
        p.account_email != null && String(p.account_email).trim() !== '' ? String(p.account_email).trim() : '—',
      accountEmailRaw:
        p.account_email != null && String(p.account_email).trim() !== '' ? String(p.account_email).trim() : '',
      communicationEmailRaw:
        p.communication_email != null && String(p.communication_email).trim() !== ''
          ? String(p.communication_email).trim()
          : '',
      communicationEmailDisplay:
        p.communication_email != null && String(p.communication_email).trim() !== ''
          ? String(p.communication_email).trim()
          : 'Same as login email',
      totalHires: numOrNull(p.total_hires),
      reliabilityScore: numOrNull(p.reliability_score),
      billingLegalName: (p.billing_legal_name != null && String(p.billing_legal_name).trim() !== '')
        ? String(p.billing_legal_name).trim()
        : '',
      billingPan: (p.billing_pan != null && String(p.billing_pan).trim() !== '') ? String(p.billing_pan).trim() : '',
      billingGstNumber:
        (p.billing_gst_number != null && String(p.billing_gst_number).trim() !== '')
          ? String(p.billing_gst_number).trim()
          : '',
    };
  }, [data?.profile]);

  const toggleEdit = () => {
    if (!editing) {
      setForm({
        description: profile.description === '—' ? '' : profile.description,
        contactPerson: profile.contactPerson === '—' ? '' : profile.contactPerson,
        contactEmail: profile.contactEmail === '—' ? '' : profile.contactEmail,
        contactPhone: profile.contactPhone === '—' ? '' : profile.contactPhone,
        headquarters: profile.headquarters === '—' ? '' : profile.headquarters,
        logoUrl: profile.logoUrl || '',
        website: profile.website || '',
        locations: profile.locations.join(', '),
        industry: profile.industryRaw,
        companyType: profile.companyTypeRaw,
        companySize: profile.companySizeRaw,
        foundedYear: profile.foundedRaw,
        billingLegalName: profile.billingLegalName || profile.companyNameRaw || '',
        billingPan: profile.billingPan,
        billingGstNumber: profile.billingGstNumber,
        communicationEmail: profile.communicationEmailRaw,
      });
    }
    setEditing((v) => !v);
  };

  const saveProfile = async () => {
    if (!form) return;
    try {
      const res = await fetch('/api/employer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          contactPerson: form.contactPerson,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          headquarters: form.headquarters,
          website: form.website,
          logoUrl: form.logoUrl,
          locations: form.locations,
          industry: form.industry,
          companyType: form.companyType,
          companySize: form.companySize,
          foundedYear: form.foundedYear === '' ? null : form.foundedYear,
          billingLegalName: form.billingLegalName,
          billingPan: form.billingPan,
          billingGstNumber: form.billingGstNumber,
          communicationEmail: form.communicationEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update profile');
      await mutate();
      await globalMutate('/api/employer/profile');
      const safeLogoUrl = pickBrowserAssetUrl(form.logoUrl);
      if (safeLogoUrl) {
        await updateSession({ brandLogoUrl: safeLogoUrl });
      }
      setEditing(false);
      addToast('Profile updated successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update profile', 'error');
    }
  };

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const imageCheck = await validateImageFileContent(file);
    if (!imageCheck.ok) {
      addToast(imageCheck.error, 'warning');
      return;
    }
    const contentType = imageCheck.contentType;
    if (file.size > 2 * 1024 * 1024) {
      addToast('Image too large (max 2MB).', 'warning');
      return;
    }
    
    setLogoUploading(true);
    try {
      const presignRes = await fetch('/api/employer/profile/logo/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      
      if (!presignRes.ok) {
        addToast(presign.error || `Could not start upload.`, 'error');
        return;
      }

      const ph = {};
      if (presign.contentType) ph['Content-Type'] = String(presign.contentType).split(';')[0].trim();
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: ph, body: file });
      
      if (!putRes.ok) {
        addToast(`Upload to storage failed.`, 'error');
        return;
      }

      const completeRes = await fetch('/api/employer/profile/logo/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: presign.fileUrl }),
      });
      
      if (!completeRes.ok) {
        addToast('Logo uploaded but could not be saved to your profile.', 'error');
        return;
      }
      
      if (form) setForm((p) => ({ ...p, logoUrl: presign.fileUrl }));
      await mutate();
      await globalMutate('/api/employer/profile');
      await updateSession({ brandLogoUrl: presign.fileUrl });
      addToast('Company logo updated successfully.', 'success');
    } catch (err) {
      addToast(err?.message || 'Upload failed.', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      {error ? <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="bg-muted rounded-lg border p-2">
                <EntityLogo
                  name={profile.companyName}
                  logoUrl={profile.logoUrl}
                  placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                  size="xl"
                  shape="rounded"
                />
            </div>
            <div className="min-w-0">
                <CardTitle className="truncate text-2xl">{profile.companyName}</CardTitle>
                <CardDescription className="mt-1">
                  {profile.industry} • {profile.companyTypeLabel}
                </CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={toggleEdit}>
              <Pencil data-icon="inline-start" /> Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><MapPin aria-hidden /> {profile.headquarters}</span>
            <span className="text-muted-foreground flex items-center gap-1.5"><Users aria-hidden />{profile.companySize === '—' ? 'Company size —' : `${profile.companySize} employees`}</span>
            <span className="text-muted-foreground flex items-center gap-1.5"><Star aria-hidden /> {profile.reliabilityScore != null ? `${profile.reliabilityScore}/5 rating` : 'Not rated yet'}</span>
            {profile.website && (
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary ml-auto flex items-center gap-1.5 font-medium hover:underline"
                >
                  <ExternalLink aria-hidden /> Visit Website
                </a>
            )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Left column — row 1 */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText aria-hidden /> About the Company</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground whitespace-pre-line text-sm leading-6">
            {profile.description}
          </p></CardContent>
        </Card>

        {/* Right column — row 1 */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone aria-hidden /> Primary Contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Contact Person</FieldLabel>
              <div className="mt-1 text-sm font-medium">{profile.contactPerson}</div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Email</FieldLabel>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                {profile.contactEmail !== '—' && <Mail size={13} className="text-tertiary" />}
                {profile.contactEmail}
              </div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Login email</FieldLabel>
              <div className="mt-1 break-all font-mono text-sm font-medium">
                {profile.accountEmail}
              </div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Communication email</FieldLabel>
              <div
                className="text-muted-foreground mt-1 break-all text-sm font-medium"
              >
                {profile.communicationEmailDisplay}
              </div>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Used for platform mail (e.g. sponsorship thank-you and receipts). Leave blank in edit mode to use your login email.
              </p>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Phone</FieldLabel>
              <div className="mt-1 text-sm font-medium">{profile.contactPhone}</div>
            </Field>
          </CardContent>
        </Card>

        {/* Left column — row 2 */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText aria-hidden /> Sponsorship Receipts</CardTitle><CardDescription>Legal and tax details used on acknowledgments.</CardDescription></CardHeader>
          <CardContent>
          {profile.billingLegalName || profile.billingPan || profile.billingGstNumber ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field className="rounded-lg border bg-muted/30 p-3">
                <FieldLabel>Legal name</FieldLabel>
                <div className="mt-1 text-sm font-medium">{profile.billingLegalName || '—'}</div>
              </Field>
              <Field className="rounded-lg border bg-muted/30 p-3">
                <FieldLabel>PAN</FieldLabel>
                <div className="mt-1 font-mono text-sm font-medium">{profile.billingPan || '—'}</div>
              </Field>
              <Field className="rounded-lg border bg-muted/30 p-3">
                <FieldLabel>GSTIN</FieldLabel>
                <div className="mt-1 font-mono text-sm font-medium">{profile.billingGstNumber || '—'}</div>
              </Field>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm leading-6">
              Not set yet. These appear on college-issued sponsorship acknowledgments. Add them when you sponsor a campus tier, or edit your company profile.
            </p>
          )}</CardContent>
        </Card>

        {/* Right column — row 2 */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin aria-hidden /> Office Locations</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.locations.length > 0 ? (
              profile.locations.map((loc, i) => (
                <Badge key={i} variant="secondary">
                  <MapPin data-icon="inline-start" /> {loc}
                </Badge>
              ))
            ) : (
              <span className="text-secondary text-sm">No locations added.</span>
            )}
          </CardContent>
        </Card>

        {/* Left column — row 3 */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 aria-hidden /> At a Glance</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Industry</FieldLabel>
              <div className="mt-1 text-sm font-medium">{profile.industry}</div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Company Type</FieldLabel>
              <div className="mt-1 text-sm font-medium">{profile.companyTypeLabel}</div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Founded</FieldLabel>
              <div className="mt-1 text-sm font-medium">{profile.founded}</div>
            </Field>
            <Field className="rounded-lg border bg-muted/30 p-3">
              <FieldLabel>Total Hires</FieldLabel>
              <div className="mt-1 text-sm font-medium tabular-nums">
                {profile.totalHires != null ? profile.totalHires : '—'}
              </div>
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal Dialog */}
      {editing && form ? (
        <Dialog open={editing} onOpenChange={(next) => { if (!next && editing) toggleEdit(); }}>
          <DialogContent className="gap-0 p-0 sm:max-w-3xl" showCloseButton>
            <DialogHeader className="border-b px-6 py-5 pr-12">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="text-muted-foreground size-5" /> Edit company profile
              </DialogTitle>
              <DialogDescription>Update company, contact, location, and sponsorship receipt details.</DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain p-6">
              <div className="bg-muted/50 mb-6 flex flex-wrap items-center gap-4 rounded-lg border p-4">
                <EntityLogo
                  name={profile.companyName}
                  logoUrl={form.logoUrl}
                  placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                  size="lg"
                  shape="rounded"
                />
                <Field className="min-w-0 flex-1">
                  <FieldLabel htmlFor="company-logo-url">Company Logo</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      render={<label htmlFor="company-logo-file" />}
                      nativeButton={false}
                      type="button"
                      variant="outline"
                      size="sm"
                    >
                      <Camera aria-hidden />
                      {logoUploading ? 'Uploading…' : 'Upload New Logo'}
                      <input id="company-logo-file" name="company-logo-file" type="file" accept="image/*" hidden disabled={logoUploading} onChange={onLogoChange} />
                    </Button>
                    <Input
                      id="company-logo-url"
                      name="company-logo-url"
                      className="min-w-52 flex-1"
                      value={form.logoUrl}
                      onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="Paste an image URL…"
                    />
                  </div>
                </Field>
              </div>

              <Tabs defaultValue="company">
                <TabsList className="mb-5">
                  <TabsTrigger value="company">Company</TabsTrigger>
                  <TabsTrigger value="contact">Contact & Locations</TabsTrigger>
                  <TabsTrigger value="receipts">Receipt Details</TabsTrigger>
                </TabsList>
                <TabsContent value="company">
              <FieldGroup className="grid gap-5 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="company-description">Company Description</FieldLabel>
                  <Textarea id="company-description" name="company-description" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe your company, culture, and mission…" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company-industry">Industry</FieldLabel>
                  <Input id="company-industry" name="company-industry" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} placeholder="For example, Information Technology…" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company-type">Company Type</FieldLabel>
                  <AdminFilterSelect
                    id="company-type"
                    className="w-full"
                    value={form.companyType}
                    onValueChange={(companyType) => setForm((p) => ({ ...p, companyType }))}
                    items={[
                      { label: '— Select —', value: 'all' },
                      ...EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
                    ]}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company-size">Company Size</FieldLabel>
                  <Input id="company-size" name="company-size" list="employer-company-size-presets" value={form.companySize} onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))} placeholder="For example, 10,000+…" />
                  <datalist id="employer-company-size-presets">
                    {EMPLOYER_COMPANY_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </datalist>
                </Field>
                <Field>
                  <FieldLabel>Founded Year</FieldLabel>
                  <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_FOUNDED_YEAR} value={form.foundedYear} onChange={(v) => setForm((p) => ({ ...p, foundedYear: v }))} placeholder="e.g. 1998" />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="company-website">Website</FieldLabel>
                  <Input id="company-website" name="company-website" type="url" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://example.com…" />
                </Field>
              </FieldGroup>
                </TabsContent>
                <TabsContent value="contact">
              <FieldGroup className="grid gap-5 sm:grid-cols-2">
                {[
                  ['contact-person', 'Primary Contact Person', 'text', form.contactPerson, 'contactPerson', 'Full name…'],
                  ['contact-email', 'Contact Email', 'email', form.contactEmail, 'contactEmail', 'email@company.com…'],
                  ['contact-phone', 'Contact Phone', 'tel', form.contactPhone, 'contactPhone', '+91 98765 43210…'],
                  ['headquarters', 'Global Headquarters', 'text', form.headquarters, 'headquarters', 'City, country…'],
                  ['office-locations', 'All Office Locations', 'text', form.locations, 'locations', 'Comma-separated cities…'],
                ].map(([id, label, type, value, key, placeholder]) => (
                  <Field key={id} className={id === 'company-website' || id === 'office-locations' ? 'sm:col-span-2' : undefined}>
                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                    <Input id={id} name={id} type={type} value={value} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
                  </Field>
                ))}
                <Field className="sm:col-span-2" data-disabled>
                  <FieldLabel htmlFor="login-email">Login email</FieldLabel>
                  <Input id="login-email" name="login-email" type="email" value={profile.accountEmailRaw} disabled readOnly />
                  <FieldDescription>Used to sign in. Contact your administrator to change it.</FieldDescription>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="communication-email">Communication email</FieldLabel>
                  <Input id="communication-email" name="communication-email" type="email" value={form.communicationEmail} onChange={(e) => setForm((p) => ({ ...p, communicationEmail: e.target.value }))} placeholder={profile.accountEmailRaw ? `Leave empty to use ${profile.accountEmailRaw}` : 'you@company.com…'} />
                  <FieldDescription>Receives platform messages and tax receipts. Leave blank to use your login email.</FieldDescription>
                </Field>
              </FieldGroup>
                </TabsContent>
                <TabsContent value="receipts">
              <FieldGroup className="grid gap-5 sm:grid-cols-2">
                <p className="text-muted-foreground sm:col-span-2 text-sm">Legal and tax details used on college acknowledgments.</p>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="billing-legal-name">Legal name</FieldLabel>
                  <Input id="billing-legal-name" name="billing-legal-name" value={form.billingLegalName} onChange={(e) => setForm((p) => ({ ...p, billingLegalName: e.target.value }))} placeholder="Registered name…" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="billing-pan">PAN</FieldLabel>
                  <Input id="billing-pan" name="billing-pan" value={form.billingPan} onChange={(e) => setForm((p) => ({ ...p, billingPan: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="billing-gstin">GSTIN</FieldLabel>
                  <Input id="billing-gstin" name="billing-gstin" value={form.billingGstNumber} onChange={(e) => setForm((p) => ({ ...p, billingGstNumber: e.target.value.toUpperCase() }))} placeholder="15-character GSTIN…" maxLength={15} />
                </Field>
              </FieldGroup>
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter className="border-t px-6 py-4">
              <Button variant="secondary" onClick={toggleEdit}>Cancel</Button>
              <Button onClick={saveProfile}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
