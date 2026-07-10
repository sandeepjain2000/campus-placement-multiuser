'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { inferImageContentType } from '@/lib/inferImageContentType';
import {
  EMPLOYER_COMPANY_TYPE_OPTIONS,
  EMPLOYER_COMPANY_SIZE_OPTIONS,
  labelEmployerCompanyType,
} from '@/lib/employerCompanyTypeLabels';

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
      industry: str(p.industry),
      companyTypeLabel: labelEmployerCompanyType(p.company_type),
      companySize: str(p.company_size),
      founded: p.founded_year != null && String(p.founded_year).trim() !== '' ? String(p.founded_year) : '—',
      industryRaw: (p.industry && String(p.industry).trim()) || '',
      companyTypeRaw: (p.company_type && String(p.company_type).trim()) || '',
      companySizeRaw: (p.company_size && String(p.company_size).trim()) || '',
      foundedRaw: p.founded_year != null ? String(p.founded_year) : '',
      logoUrl: p.logo_url != null && String(p.logo_url).trim() !== '' ? String(p.logo_url).trim() : '',
      website: p.website != null && String(p.website).trim() !== '' ? String(p.website).trim() : '',
      headquarters: str(p.headquarters),
      locations: Array.isArray(p.locations) ? p.locations : [],
      description: str(p.description),
      contactPerson: str(p.contact_person),
      contactEmail: str(p.contact_email),
      contactPhone: str(p.contact_phone),
      totalHires: numOrNull(p.total_hires),
      reliabilityScore: numOrNull(p.reliability_score),
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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update profile');
      await mutate();
      setEditing(false);
      addToast('Profile updated.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update profile', 'error');
    }
  };

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      addToast('No file selected.', 'warning');
      return;
    }
    const contentType = inferImageContentType(file);
    if (!contentType) {
      addToast('Choose a JPEG, PNG, WebP, or GIF (browser did not report a usable image type).', 'warning');
      appendClientDebugLog({
        source: 'employer_profile_logo',
        action: 'reject_type',
        fileName: file.name,
        reportedType: file.type || null,
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('Image too large (max 2MB).', 'warning');
      return;
    }
    setLogoUploading(true);
    try {
      appendClientDebugLog({
        source: 'employer_profile_logo',
        action: 'presign_request',
        fileName: file.name,
        contentType,
        fileSize: file.size,
      });
      const presignRes = await fetch('/api/employer/profile/logo/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
      });
      let presign = {};
      try {
        presign = await presignRes.json();
      } catch {
        presign = {};
      }
      appendClientDebugLog({
        source: 'employer_profile_logo',
        action: 'presign_response',
        status: presignRes.status,
        ok: presignRes.ok,
        error: presign.error || null,
      });
      if (presignRes.status === 503) {
        addToast(
          `${presign.error || 'Logo storage not configured'}. Add AWS/S3 env vars on the server and redeploy.`,
          'error',
        );
        return;
      }
      if (!presignRes.ok) {
        addToast(presign.error || `Could not start upload (HTTP ${presignRes.status}).`, 'error');
        return;
      }
      const ph = {};
      if (presign.contentType) ph['Content-Type'] = String(presign.contentType).split(';')[0].trim();
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: ph, body: file });
      let putDetail = '';
      try {
        putDetail = (await putRes.text()).slice(0, 500);
      } catch {
        putDetail = '';
      }
      appendClientDebugLog({
        source: 'employer_profile_logo',
        action: 's3_put',
        status: putRes.status,
        ok: putRes.ok,
      });
      if (!putRes.ok) {
        addToast(
          `Upload to storage failed (HTTP ${putRes.status}). Check S3 CORS for PUT from this site. ${putDetail ? putDetail.slice(0, 120) : ''}`.trim(),
          'error',
        );
        return;
      }
      const completeRes = await fetch('/api/employer/profile/logo/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: presign.fileUrl }),
      });
      const complete = await completeRes.json().catch(() => ({}));
      appendClientDebugLog({
        source: 'employer_profile_logo',
        action: 'complete',
        status: completeRes.status,
        ok: completeRes.ok,
        error: complete.error || null,
      });
      if (!completeRes.ok) {
        addToast(complete.error || 'Logo uploaded but could not be saved to your profile.', 'error');
        return;
      }
      if (form) setForm((p) => ({ ...p, logoUrl: presign.fileUrl }));
      await mutate();
      addToast('Company logo uploaded.', 'success');
      appendClientDebugLog({ source: 'employer_profile_logo', action: 'success', fileUrl: presign.fileUrl });
    } catch (err) {
      const msg = err?.message || 'Upload failed (network).';
      addToast(msg, 'error');
      appendClientDebugLog({ source: 'employer_profile_logo', action: 'error', message: msg });
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {error ? <div className="card text-secondary" style={{ marginBottom: '1rem' }}>{error.message}</div> : null}
      <div className="profile-header" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
        <div className="profile-avatar" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EntityLogo
            name={profile.companyName}
            logoUrl={profile.logoUrl}
            website={profile.website}
            size="xl"
            shape="rounded"
          />
        </div>
        <div className="profile-info" style={{ position: 'relative', zIndex: 1 }}>
          <h2>{profile.companyName}</h2>
          <p>{profile.industry} • {profile.companyTypeLabel} • Founded {profile.founded}</p>
          <div className="profile-meta">
            <div className="profile-meta-item">📍 {profile.headquarters}</div>
            <div className="profile-meta-item">
              {profile.companySize === '—' ? '👥 Company size —' : `👥 ${profile.companySize} employees`}
            </div>
            <div className="profile-meta-item">
              ⭐{' '}
              {profile.reliabilityScore != null
                ? `${profile.reliabilityScore}/5 rating`
                : 'Not rated yet'}
            </div>
            <div className="profile-meta-item">
              🎓{' '}
              {profile.totalHires != null ? `${profile.totalHires} total hires` : 'Hires not recorded'}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={toggleEdit} style={{ position: 'relative', zIndex: 1 }}>
          {editing ? '✕ Cancel' : '✏️ Edit'}
        </button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">🏢 Company Details</h3></div>
          <div className="drive-info-grid">
            <div className="drive-info-item"><div className="drive-info-label">Industry</div><div className="drive-info-value">{profile.industry}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Type</div><div className="drive-info-value">{profile.companyTypeLabel}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Size</div><div className="drive-info-value">{profile.companySize}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Founded</div><div className="drive-info-value">{profile.founded}</div></div>
            <div className="drive-info-item">
              <div className="drive-info-label">Website</div>
              <div className="drive-info-value">
                {profile.website ? (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">📞 Contact Information</h3></div>
          <div className="drive-info-grid">
            <div className="drive-info-item"><div className="drive-info-label">Contact Person</div><div className="drive-info-value">{profile.contactPerson}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Email</div><div className="drive-info-value">{profile.contactEmail}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Phone</div><div className="drive-info-value">{profile.contactPhone}</div></div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><h3 className="card-title">📍 Office Locations</h3></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.locations.map((loc, i) => (
              <span key={i} className="badge badge-blue" style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}>📍 {loc}</span>
            ))}
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><h3 className="card-title">📝 About</h3></div>
          {editing && form ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Industry</label>
                <input className="form-input" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Information Technology" />
              </div>
              <div className="grid grid-2" style={{ gap: '0.6rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Company type</label>
                  <select
                    className="form-input"
                    value={form.companyType}
                    onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Company size (employees)</label>
                  <input
                    className="form-input"
                    list="employer-company-size-presets"
                    value={form.companySize}
                    onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))}
                    placeholder="e.g. 10000+ or pick a suggestion"
                  />
                  <datalist id="employer-company-size-presets">
                    {EMPLOYER_COMPANY_SIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Founded year</label>
                <input
                  className="form-input"
                  type="number"
                  min={1600}
                  max={new Date().getFullYear() + 1}
                  value={form.foundedYear}
                  onChange={(e) => setForm((p) => ({ ...p, foundedYear: e.target.value }))}
                  placeholder="e.g. 1981"
                />
              </div>
              <textarea className="form-textarea" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <input className="form-input" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" />
              <input className="form-input" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="Contact email" />
              <input className="form-input" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact phone" />
              <input className="form-input" value={form.headquarters} onChange={(e) => setForm((p) => ({ ...p, headquarters: e.target.value }))} placeholder="Headquarters" />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className={`btn btn-secondary btn-sm${logoUploading ? ' disabled' : ''}`} style={{ cursor: logoUploading ? 'wait' : 'pointer', margin: 0 }}>
                  {logoUploading ? 'Uploading logo…' : 'Upload logo'}
                  <input type="file" accept="image/*" hidden disabled={logoUploading} onChange={onLogoChange} />
                </label>
                <input className="form-input" value={form.logoUrl} onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="Or paste logo image URL" />
              </div>
              <input className="form-input" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" />
              <input className="form-input" value={form.locations} onChange={(e) => setForm((p) => ({ ...p, locations: e.target.value }))} placeholder="Locations (comma separated)" />
              <div>
                <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save profile</button>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ lineHeight: 1.7 }}>{profile.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
