'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, GraduationCap, MapPin, Pencil, School, User } from 'lucide-react';
import CompanyNameLink from '@/components/CompanyNameLink';
import EntityLogo from '@/components/EntityLogo';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { collegePlacementRate, collegeToForm } from '@/lib/adminCollegeProfile';
import {
  COLLEGE_TYPE_CLASSIFICATIONS,
  UNIVERSITY_TYPE_CLASSIFICATIONS,
} from '@/lib/tenantInstitutionClassifications';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { StatusBadge } from '@/components/ui/status-badge';

function DetailRow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div
        className="text-xs font-semibold text-secondary"
        style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        {label}
      </div>
      <div className="text-sm" style={{ marginTop: '0.2rem', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function YesNoBadge({ value }) {
  return <StatusBadge tone={value ? 'green' : 'gray'} showDot>{value ? 'Yes' : 'No'}</StatusBadge>;
}

function InstitutionClassificationView({ title, subtitle, fields, values }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle>{subtitle ? <CardDescription>{subtitle}</CardDescription> : null}</CardHeader>
      <CardContent className="grid gap-3">
        {fields.map((field) => (
          <div
            key={field.key}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.5rem',
              paddingBottom: '0.65rem',
            }}
            className="border-b pb-3 last:border-0 last:pb-0"
          >
            <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
              <div className="text-sm" style={{ fontWeight: 600 }}>{field.label}</div>
              {field.hint ? (
                <div className="text-muted-foreground mt-1 text-xs">
                  {field.hint}
                </div>
              ) : null}
            </div>
            <YesNoBadge value={Boolean(values?.[field.key])} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InstitutionClassificationEdit({ title, subtitle, fields, values, onChange }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle>{subtitle ? <CardDescription>{subtitle}</CardDescription> : null}</CardHeader>
      <CardContent><FieldGroup>
        {fields.map((field) => (
          <Field key={field.key}>
            <FieldLabel htmlFor={`classification-${field.key}`}>{field.label}</FieldLabel>
            {field.hint ? (
              <FieldDescription>{field.hint}</FieldDescription>
            ) : null}
            <AdminFilterSelect
              id={`classification-${field.key}`}
              className="w-full"
              value={values?.[field.key] ? 'yes' : 'no'}
              emptyMapsToAll={false}
              onValueChange={(v) => onChange(field.key, v === 'yes')}
              items={[
                { label: 'No', value: 'no' },
                { label: 'Yes', value: 'yes' },
              ]}
            />
          </Field>
        ))}
      </FieldGroup></CardContent>
    </Card>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <Card size="sm"><CardContent><p className="text-muted-foreground m-0 text-xs font-medium uppercase tracking-wide">{label}</p><p className="mt-1 mb-0 text-xl font-semibold">{value}</p>{hint ? <p className="text-muted-foreground mt-1 mb-0 text-xs">{hint}</p> : null}</CardContent></Card>
  );
}

/**
 * Full-screen college profile for super admin.
 * @param {{ collegeId: string }} props
 */
export default function AdminCollegeProfileScreen({ collegeId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(collegeToForm(null));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadCollege = useCallback(async () => {
    if (!collegeId) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load college');
      setDetail(json.college);
      setForm(collegeToForm(json.college));
    } catch (e) {
      setLoadError(e.message || 'Failed to load college');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    void loadCollege();
  }, [loadCollege]);

  useEffect(() => {
    if (loading) return;
    const mode = String(searchParams.get('mode') || '').trim().toLowerCase();
    setEditing(mode === 'edit');
  }, [loading, searchParams]);

  const startEdit = () => {
    if (detail) setForm(collegeToForm(detail));
    setEditing(true);
    router.replace(`/dashboard/admin/colleges/${collegeId}?mode=edit`, { scroll: false });
  };

  const cancelEdit = () => {
    if (detail) setForm(collegeToForm(detail));
    setEditing(false);
    router.replace(`/dashboard/admin/colleges/${collegeId}`, { scroll: false });
  };

  const toggleCollegeActive = async (nextActive) => {
    if (!detail) return;
    const prompt = nextActive
      ? `Reactivate ${detail.name} on the platform? College admins will be able to sign in again.`
      : `Deactivate ${detail.name}? The college will be hidden from employer campus lists and college admins cannot sign in until reactivated.`;
    if (!window.confirm(prompt)) return;

    setTogglingActive(true);
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...collegeToForm(detail), active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update college status');
      setDetail(json.college);
      setForm(collegeToForm(json.college));
      addToast(
        nextActive ? 'College reactivated on the platform.' : 'College deactivated on the platform.',
        'success',
      );
    } catch (e) {
      addToast(e.message || 'Failed to update college status', 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  const saveCollege = async () => {
    if (form.nirfRank !== '' && form.nirfRank != null) {
      const nirfErr = validateFieldOrError(FIELD_IDS.ADMIN_NIRF_RANK, form.nirfRank);
      if (nirfErr) {
        addToast(nirfErr, 'warning');
        return;
      }
    }
    const pinErr = validateFieldOrError(FIELD_IDS.ADMIN_PINCODE, form.pincode);
    if (pinErr) {
      addToast(pinErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          website: form.website,
          email: form.email,
          phone: form.phone,
          naac: form.naac,
          nirfRank: form.nirfRank,
          active: form.active,
          institutionClassifications: form.institutionClassifications,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save college');
      addToast('College updated', 'success');
      setDetail(json.college);
      setForm(collegeToForm(json.college));
      setEditing(false);
      router.replace(`/dashboard/admin/colleges/${collegeId}`, { scroll: false });
    } catch (e) {
      addToast(e.message || 'Failed to save college', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!collegeId) {
    return (
      <Alert variant="destructive"><AlertDescription>Invalid college.</AlertDescription><Button className="mt-3" variant="outline" render={<Link href="/dashboard/admin/colleges" />}>Back to colleges</Button></Alert>
    );
  }

  if (loading) {
    return (
      <Card><CardHeader><CardTitle>College profile</CardTitle><CardDescription>Loading college details…</CardDescription></CardHeader></Card>
    );
  }

  if (loadError || !detail) {
    return (
      <Alert variant="destructive"><AlertDescription>{loadError || 'College not found.'}</AlertDescription><Button className="mt-3" variant="outline" render={<Link href="/dashboard/admin/colleges" />}>Back to colleges</Button></Alert>
    );
  }

  const placementPct = collegePlacementRate(detail.students, detail.placed);

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard/admin/colleges')}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden />
          All colleges
        </Button>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={saveCollege} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <>
              {detail.active ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={togglingActive}
                  onClick={() => toggleCollegeActive(false)}
                >
                  {togglingActive ? 'Updating…' : 'Deactivate college'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={togglingActive}
                  onClick={() => toggleCollegeActive(true)}
                >
                  {togglingActive ? 'Updating…' : 'Reactivate college'}
                </Button>
              )}
              <Button type="button" onClick={startEdit}>
                <Pencil data-icon="inline-start" aria-hidden />
                Edit college
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <EntityLogo name={detail.name} website={detail.website} size="lg" shape="rounded" />
          <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
            <p className="text-xs font-semibold text-secondary" style={{ margin: 0, textTransform: 'uppercase' }}>
              College profile
            </p>
            <h1 style={{ margin: '0.25rem 0 0', fontSize: 'clamp(1.35rem, 3vw, 1.85rem)', lineHeight: 1.2 }}>
              {detail.name}
            </h1>
            <p className="text-secondary text-sm" style={{ margin: '0.35rem 0 0' }}>
              {[detail.city, detail.state].filter(Boolean).join(', ') || 'Location not set'}
              {detail.pincode ? ` · ${detail.pincode}` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
              <StatusBadge tone={detail.active ? 'green' : 'gray'} showDot>
                {detail.active ? 'Active' : 'Inactive'}
              </StatusBadge>
              {detail.naac ? <StatusBadge tone="indigo">NAAC {detail.naac}</StatusBadge> : null}
              {detail.nirfRank != null ? (
                <StatusBadge tone="gray">NIRF #{detail.nirfRank}</StatusBadge>
              ) : null}
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      {!editing ? (
        <>
          <div
            className="admin-entity-profile-stats"
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              marginBottom: '1.25rem',
            }}
          >
            <StatCard label="Students" value={detail.students} />
            <StatCard label="Placed" value={detail.placed} />
            <StatCard label="Placement rate" value={`${placementPct}%`} />
            <StatCard
              label="Registered"
              value={detail.createdAt ? formatDate(detail.createdAt) : '—'}
              hint="On platform"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1.25rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            }}
          >
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-secondary" aria-hidden />
                Location & contact
              </CardTitle></CardHeader><CardContent>
              <DetailRow label="City">{detail.city || '—'}</DetailRow>
              <DetailRow label="State">{detail.state || '—'}</DetailRow>
              <DetailRow label="Pincode">{detail.pincode || '—'}</DetailRow>
              <DetailRow label="Contact email">
                {detail.email ? (
                  <a href={`mailto:${detail.email}`} className="text-primary font-medium hover:underline">
                    {detail.email}
                  </a>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Phone">{detail.phone || '—'}</DetailRow>
              <DetailRow label="Website">
                {detail.website ? (
                  <CompanyNameLink name={detail.name} website={detail.website} />
                ) : (
                  '—'
                )}
              </DetailRow>
              </CardContent></Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2">
                <GraduationCap size={18} className="text-secondary" aria-hidden />
                Academics & admin
              </CardTitle></CardHeader><CardContent>
              <DetailRow label="NAAC grade">{detail.naac || '—'}</DetailRow>
              <DetailRow label="NIRF rank">{detail.nirfRank != null ? detail.nirfRank : '—'}</DetailRow>
              <DetailRow label="Primary admin">
                {detail.adminName ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} aria-hidden />
                    {detail.adminName}
                  </span>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Admin email">
                {detail.adminEmail ? (
                  <a href={`mailto:${detail.adminEmail}`} className="text-primary font-medium hover:underline">
                    {detail.adminEmail}
                  </a>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Platform slug">
                <span className="font-mono text-xs">{detail.slug}</span>
              </DetailRow>
              </CardContent></Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-secondary" aria-hidden />
                Platform record
              </CardTitle></CardHeader><CardContent>
              <DetailRow label="College ID">
                <span className="font-mono text-xs">{detail.id}</span>
              </DetailRow>
              <DetailRow label="Status on platform">{detail.active ? 'Active' : 'Inactive'}</DetailRow>
              <DetailRow label="Students enrolled">{detail.students}</DetailRow>
              <DetailRow label="Students placed">{detail.placed}</DetailRow>
              </CardContent></Card>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1.25rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              marginTop: '1.25rem',
            }}
          >
            <InstitutionClassificationView
              title="University types (degree granting)"
              subtitle="Super-admin only. Not visible to the college login."
              fields={UNIVERSITY_TYPE_CLASSIFICATIONS}
              values={detail.institutionClassifications}
            />
            <InstitutionClassificationView
              title="College types (teaching institutes)"
              subtitle="Super-admin only. Shown to employers on the campus profile."
              fields={COLLEGE_TYPE_CLASSIFICATIONS}
              values={detail.institutionClassifications}
            />
          </div>
        </>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader><CardTitle className="flex items-center gap-2">
            <School size={18} className="text-secondary" aria-hidden />
            Edit college
          </CardTitle><CardDescription>Update institution contact details, rankings, and platform access.</CardDescription></CardHeader>
          <CardContent><FieldGroup>
            <Field>
              <FieldLabel htmlFor="college-profile-name">College name</FieldLabel>
              <Input id="college-profile-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="college-profile-city">City</FieldLabel>
                <Input id="college-profile-city"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="college-profile-state">State</FieldLabel>
                <Input id="college-profile-state"
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="college-profile-pincode">Pincode</FieldLabel>
              <Input id="college-profile-pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={form.pincode}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="college-profile-website">Website</FieldLabel>
              <Input id="college-profile-website"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="college-profile-email">Contact email</FieldLabel>
              <Input id="college-profile-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="college-profile-phone">Phone</FieldLabel>
              <Input id="college-profile-phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="college-profile-naac">NAAC grade</FieldLabel>
                <Input id="college-profile-naac"
                  value={form.naac}
                  onChange={(e) => setForm((p) => ({ ...p, naac: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>NIRF rank</FieldLabel>
                <ValidatedNumberInput
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3"
                  fieldId={FIELD_IDS.ADMIN_NIRF_RANK}
                  value={form.nirfRank}
                  onChange={(v) => setForm((p) => ({ ...p, nirfRank: v }))}
                />
              </Field>
            </div>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="college-profile-active">College is active on the platform</FieldLabel>
              <Checkbox
                id="college-profile-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, active: !!v }))}
              />
              <FieldDescription>Visible to employers; college admins can sign in.</FieldDescription>
            </Field>
          </FieldGroup></CardContent>

          <div
            style={{
              display: 'grid',
              gap: '1.25rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              marginTop: '1.25rem',
            }}
          >
            <InstitutionClassificationEdit
              title="University types (degree granting)"
              subtitle="Set Yes/No for each classification. Employers can view these on the campus profile."
              fields={UNIVERSITY_TYPE_CLASSIFICATIONS}
              values={form.institutionClassifications}
              onChange={(key, value) =>
                setForm((p) => ({
                  ...p,
                  institutionClassifications: {
                    ...p.institutionClassifications,
                    [key]: value,
                  },
                }))
              }
            />
            <InstitutionClassificationEdit
              title="College types (teaching institutes)"
              subtitle="Set Yes/No for each classification. Employers can view these on the campus profile."
              fields={COLLEGE_TYPE_CLASSIFICATIONS}
              values={form.institutionClassifications}
              onChange={(key, value) =>
                setForm((p) => ({
                  ...p,
                  institutionClassifications: {
                    ...p.institutionClassifications,
                    [key]: value,
                  },
                }))
              }
            />
          </div>
        </Card>
      )}
    </div>
  );
}
