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
  return (
    <span className={`badge ${value ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.75rem' }}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}

function InstitutionClassificationView({ title, subtitle, fields, values }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <h2 className="card-title" style={{ fontSize: '1rem' }}>{title}</h2>
      {subtitle ? (
        <p className="text-sm text-secondary" style={{ margin: '0 0 0.85rem', lineHeight: 1.5 }}>
          {subtitle}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: '0.65rem' }}>
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
              borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
              <div className="text-sm" style={{ fontWeight: 600 }}>{field.label}</div>
              {field.hint ? (
                <div className="text-xs text-secondary" style={{ marginTop: '0.15rem', lineHeight: 1.45 }}>
                  {field.hint}
                </div>
              ) : null}
            </div>
            <YesNoBadge value={Boolean(values?.[field.key])} />
          </div>
        ))}
      </div>
    </section>
  );
}

function InstitutionClassificationEdit({ title, subtitle, fields, values, onChange }) {
  return (
    <section className="card" style={{ margin: 0 }}>
      <h2 className="card-title" style={{ fontSize: '1rem' }}>{title}</h2>
      {subtitle ? (
        <p className="text-sm text-secondary" style={{ margin: '0 0 0.85rem', lineHeight: 1.5 }}>
          {subtitle}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {fields.map((field) => (
          <div key={field.key} className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{field.label}</label>
            {field.hint ? (
              <p className="text-xs text-secondary" style={{ margin: '0.15rem 0 0.35rem', lineHeight: 1.45 }}>
                {field.hint}
              </p>
            ) : null}
            <select
              className="form-input"
              value={values?.[field.key] ? 'yes' : 'no'}
              onChange={(e) =>
                onChange(field.key, e.target.value === 'yes')
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card admin-profile-stat-card" style={{ margin: 0 }}>
      <p className="text-xs text-tertiary" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
      <p style={{ margin: '0.35rem 0 0', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
      {hint ? (
        <p className="text-xs text-secondary" style={{ margin: '0.25rem 0 0' }}>
          {hint}
        </p>
      ) : null}
    </div>
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
      <div className="card">
        <p style={{ color: 'var(--danger-600)' }}>Invalid college.</p>
        <Link href="/dashboard/admin/colleges" className="btn btn-secondary" style={{ marginTop: '0.75rem' }}>
          Back to colleges
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-entity-profile-page">
        <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="admin-entity-profile-page animate-fadeIn">
        <div className="card">
          <p style={{ color: 'var(--danger-600)', marginBottom: '0.75rem' }}>{loadError || 'College not found.'}</p>
          <Link href="/dashboard/admin/colleges" className="btn btn-secondary">
            Back to colleges
          </Link>
        </div>
      </div>
    );
  }

  const placementPct = collegePlacementRate(detail.students, detail.placed);

  return (
    <div className="admin-entity-profile-page animate-fadeIn">
      <div className="admin-entity-profile-toolbar">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.push('/dashboard/admin/colleges')}
        >
          <ArrowLeft size={16} aria-hidden style={{ marginRight: '0.35rem' }} />
          All colleges
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {editing ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveCollege} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              {detail.active ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={togglingActive}
                  onClick={() => toggleCollegeActive(false)}
                >
                  {togglingActive ? 'Updating…' : 'Deactivate college'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={togglingActive}
                  onClick={() => toggleCollegeActive(true)}
                >
                  {togglingActive ? 'Updating…' : 'Reactivate college'}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={startEdit}>
                <Pencil size={15} aria-hidden style={{ marginRight: '0.35rem' }} />
                Edit college
              </button>
            </>
          )}
        </div>
      </div>

      <header className="card admin-entity-profile-hero">
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
              <span className={`badge badge-dot ${detail.active ? 'badge-green' : 'badge-gray'}`}>
                {detail.active ? 'Active' : 'Inactive'}
              </span>
              {detail.naac ? <span className="badge badge-indigo">NAAC {detail.naac}</span> : null}
              {detail.nirfRank != null ? (
                <span className="badge badge-gray">NIRF #{detail.nirfRank}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

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
            <section className="card" style={{ margin: 0 }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <MapPin size={18} className="text-secondary" aria-hidden />
                Location & contact
              </h2>
              <DetailRow label="City">{detail.city || '—'}</DetailRow>
              <DetailRow label="State">{detail.state || '—'}</DetailRow>
              <DetailRow label="Pincode">{detail.pincode || '—'}</DetailRow>
              <DetailRow label="Contact email">
                {detail.email ? (
                  <a href={`mailto:${detail.email}`} className="admin-entity-name-btn" style={{ display: 'inline' }}>
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
            </section>

            <section className="card" style={{ margin: 0 }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <GraduationCap size={18} className="text-secondary" aria-hidden />
                Academics & admin
              </h2>
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
                  <a href={`mailto:${detail.adminEmail}`} className="admin-entity-name-btn" style={{ display: 'inline' }}>
                    {detail.adminEmail}
                  </a>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Platform slug">
                <span className="font-mono text-xs">{detail.slug}</span>
              </DetailRow>
            </section>

            <section className="card" style={{ margin: 0 }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Building2 size={18} className="text-secondary" aria-hidden />
                Platform record
              </h2>
              <DetailRow label="College ID">
                <span className="font-mono text-xs">{detail.id}</span>
              </DetailRow>
              <DetailRow label="Status on platform">{detail.active ? 'Active' : 'Inactive'}</DetailRow>
              <DetailRow label="Students enrolled">{detail.students}</DetailRow>
              <DetailRow label="Students placed">{detail.placed}</DetailRow>
            </section>
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
        <section className="card" style={{ maxWidth: '42rem' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <School size={18} className="text-secondary" aria-hidden />
            Edit college
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">College name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  className="form-input"
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                className="form-input"
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
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact email</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">NAAC grade</label>
                <input
                  className="form-input"
                  value={form.naac}
                  onChange={(e) => setForm((p) => ({ ...p, naac: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">NIRF rank</label>
                <ValidatedNumberInput
                  fieldId={FIELD_IDS.ADMIN_NIRF_RANK}
                  value={form.nirfRank}
                  onChange={(v) => setForm((p) => ({ ...p, nirfRank: v }))}
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              <span className="text-sm">College is active on the platform (visible to employers; admins can sign in)</span>
            </label>
          </div>

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
        </section>
      )}
    </div>
  );
}
