'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import EntityLogo from '@/components/EntityLogo';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load profile');
  return json;
};

export default function EmployerProfilePage() {
  const [editing, setEditing] = useState(false);
  const { addToast } = useToast();
  const { data, error, mutate } = useSWR('/api/employer/profile', fetcher);
  const [form, setForm] = useState(null);
  const profile = useMemo(() => {
    const p = data?.profile || {};
    return {
      companyName: p.company_name || '—',
      industry: p.industry || '—',
      companyType: p.company_type || '—',
      companySize: p.company_size || '—',
      founded: p.founded_year || '—',
      website: p.website || '',
      headquarters: p.headquarters || '—',
      locations: Array.isArray(p.locations) ? p.locations : [],
      description: p.description || '—',
      contactPerson: p.contact_person || '—',
      contactEmail: p.contact_email || '—',
      contactPhone: p.contact_phone || '—',
      totalHires: p.total_hires || 0,
      reliabilityScore: p.reliability_score || 0,
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
        website: profile.website || '',
        locations: profile.locations.join(', '),
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
        body: JSON.stringify(form),
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

  return (
    <div className="animate-fadeIn">
      {error ? <div className="card text-secondary" style={{ marginBottom: '1rem' }}>{error.message}</div> : null}
      <div className="profile-header" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
        <div className="profile-avatar" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EntityLogo
            name={profile.companyName}
            website={profile.website}
            size="xl"
            shape="rounded"
          />
        </div>
        <div className="profile-info" style={{ position: 'relative', zIndex: 1 }}>
          <h2>{profile.companyName}</h2>
          <p>{profile.industry} • {profile.companyType} • Founded {profile.founded}</p>
          <div className="profile-meta">
            <div className="profile-meta-item">📍 {profile.headquarters}</div>
            <div className="profile-meta-item">👥 {profile.companySize} employees</div>
            <div className="profile-meta-item">⭐ {profile.reliabilityScore}/5 Rating</div>
            <div className="profile-meta-item">🎓 {profile.totalHires} Total Hires</div>
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
            <div className="drive-info-item"><div className="drive-info-label">Type</div><div className="drive-info-value">{profile.companyType}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Size</div><div className="drive-info-value">{profile.companySize}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Founded</div><div className="drive-info-value">{profile.founded}</div></div>
            <div className="drive-info-item"><div className="drive-info-label">Website</div><div className="drive-info-value"><a href={profile.website}>{profile.website}</a></div></div>
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
              <textarea className="form-textarea" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <input className="form-input" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" />
              <input className="form-input" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="Contact email" />
              <input className="form-input" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact phone" />
              <input className="form-input" value={form.headquarters} onChange={(e) => setForm((p) => ({ ...p, headquarters: e.target.value }))} placeholder="Headquarters" />
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
