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
import { Building2, Phone, MapPin, FileText, Pencil, GraduationCap, Star, Users, ExternalLink, Mail, Camera } from 'lucide-react';

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
    <div className="animate-fadeIn">
      {error ? <div className="card text-secondary mb-4">{error.message}</div> : null}
      
      {/* Premium Hero Banner */}
      <div 
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--banner-gradient)',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Abstract Background Elements */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '5%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ 
          padding: '2.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
              }}>
                <EntityLogo
                  name={profile.companyName}
                  logoUrl={profile.logoUrl}
                  placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                  size="xl"
                  shape="rounded"
                />
              </div>
              <div style={{ color: 'white' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {profile.companyName}
                </h1>
                <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0, fontWeight: 500 }}>
                  {profile.industry} • {profile.companyTypeLabel}
                </p>
              </div>
            </div>
            <button 
              className="btn" 
              onClick={toggleEdit} 
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              <Pencil size={15} /> Edit Profile
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap', 
            background: 'rgba(0,0,0,0.2)', 
            padding: '0.75rem 1.25rem', 
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.95)',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={14} style={{ opacity: 0.7 }} /> {profile.headquarters}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={14} style={{ opacity: 0.7 }} />{profile.companySize === '—' ? 'Company size —' : `${profile.companySize} employees`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={14} style={{ opacity: 0.7 }} /> {profile.reliabilityScore != null ? `${profile.reliabilityScore}/5 rating` : 'Not rated yet'}
            </div>
            {profile.website !== '—' && profile.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}
                  className="hover:underline"
                >
                  <ExternalLink size={14} /> Visit Website
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column — row 1 */}
        <div className="card card-hover">
          <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <FileText size={18} className="text-primary-600" /> About the Company
            </h3>
          </div>
          <p className="text-secondary" style={{ lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line', margin: 0 }}>
            {profile.description}
          </p>
        </div>

        {/* Right column — row 1 */}
        <div className="card card-hover">
          <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <Phone size={18} className="text-primary-600" /> Primary Contact
            </h3>
          </div>
          <div className="drive-info-grid" style={{ gap: '1.25rem' }}>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Person</div>
              <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.contactPerson}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
              <div className="drive-info-value" style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {profile.contactEmail !== '—' && <Mail size={13} className="text-tertiary" />}
                {profile.contactEmail}
              </div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login email</div>
              <div className="drive-info-value" style={{ fontWeight: 500, fontFamily: 'ui-monospace, monospace', fontSize: '0.9rem' }}>
                {profile.accountEmail}
              </div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Communication email</div>
              <div
                className="drive-info-value"
                style={{
                  fontWeight: 500,
                  fontFamily: profile.communicationEmailRaw ? 'ui-monospace, monospace' : undefined,
                  fontSize: '0.9rem',
                  color: profile.communicationEmailRaw ? undefined : 'var(--text-secondary)',
                }}
              >
                {profile.communicationEmailDisplay}
              </div>
              <p className="text-xs text-tertiary" style={{ margin: '0.35rem 0 0', lineHeight: 1.4 }}>
                Used for platform mail (e.g. sponsorship thank-you and receipts). Leave blank in edit mode to use your login email.
              </p>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
              <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.contactPhone}</div>
            </div>
          </div>
        </div>

        {/* Left column — row 2 */}
        <div className="card card-hover">
          <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <FileText size={18} className="text-primary-600" /> Sponsorship receipts (legal / tax)
            </h3>
          </div>
          {profile.billingLegalName || profile.billingPan || profile.billingGstNumber ? (
            <div className="drive-info-grid" style={{ gap: '1rem' }}>
              <div className="drive-info-item">
                <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal name</div>
                <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.billingLegalName || '—'}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAN</div>
                <div className="drive-info-value" style={{ fontWeight: 500, fontFamily: 'ui-monospace, monospace' }}>{profile.billingPan || '—'}</div>
              </div>
              <div className="drive-info-item">
                <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GSTIN</div>
                <div className="drive-info-value" style={{ fontWeight: 500, fontFamily: 'ui-monospace, monospace' }}>{profile.billingGstNumber || '—'}</div>
              </div>
            </div>
          ) : (
            <p className="text-secondary text-sm" style={{ margin: 0, lineHeight: 1.55 }}>
              Not set yet. These appear on college-issued sponsorship acknowledgments. Add them when you sponsor a campus tier, or edit your company profile.
            </p>
          )}
        </div>

        {/* Right column — row 2 */}
        <div className="card card-hover">
          <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <MapPin size={18} className="text-primary-600" /> Office Locations
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.locations.length > 0 ? (
              profile.locations.map((loc, i) => (
                <span key={i} className="badge badge-blue" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 500, border: '1px solid var(--blue-200)' }}>
                  <MapPin size={12} style={{ marginRight: '0.25rem', opacity: 0.7 }} /> {loc}
                </span>
              ))
            ) : (
              <span className="text-secondary text-sm">No locations added.</span>
            )}
          </div>
        </div>

        {/* Left column — row 3 */}
        <div className="card card-hover">
          <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              <Building2 size={18} className="text-primary-600" /> At a Glance
            </h3>
          </div>
          <div className="drive-info-grid" style={{ gap: '1.25rem' }}>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry</div>
              <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.industry}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Type</div>
              <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.companyTypeLabel}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founded</div>
              <div className="drive-info-value" style={{ fontWeight: 500 }}>{profile.founded}</div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Hires</div>
              <div className="drive-info-value" style={{ fontWeight: 500, color: 'var(--primary-600)' }}>
                {profile.totalHires != null ? profile.totalHires : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {editing && form && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && toggleEdit()}>
          <div className="modal modal-lg animate-in fade-in slide-in-from-bottom-4" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pencil size={20} className="text-primary-600" /> Edit Company Profile
              </h2>
              <button type="button" className="modal-close" onClick={toggleEdit}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <EntityLogo
                  name={profile.companyName}
                  logoUrl={form.logoUrl}
                  placeholderUrl={DEFAULT_ENTITY_LOGO_URL}
                  size="lg"
                  shape="rounded"
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>Company Logo</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className={`btn btn-secondary btn-sm${logoUploading ? ' disabled' : ''}`} style={{ cursor: logoUploading ? 'wait' : 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Camera size={14} />
                      {logoUploading ? 'Uploading…' : 'Upload New Logo'}
                      <input type="file" accept="image/*" hidden disabled={logoUploading} onChange={onLogoChange} />
                    </label>
                    <input
                      className="form-input form-input-sm"
                      style={{ flex: 1, minWidth: '200px' }}
                      value={form.logoUrl}
                      onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="Or paste https://… or /logos/No-Selection-Icon.png"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1.25rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Company Description</label>
                  <textarea 
                    className="form-textarea" 
                    rows={4} 
                    value={form.description} 
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} 
                    placeholder="Provide a brief overview of your company, culture, and mission."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Information Technology" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Company Type</label>
                  <select className="form-select" value={form.companyType} onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value }))}>
                    <option value="">— Select —</option>
                    {EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Size</label>
                  <input className="form-input" list="employer-company-size-presets" value={form.companySize} onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))} placeholder="e.g. 10000+" />
                  <datalist id="employer-company-size-presets">
                    {EMPLOYER_COMPANY_SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Founded Year</label>
                  <ValidatedNumberInput fieldId={FIELD_IDS.EMPLOYER_FOUNDED_YEAR} value={form.foundedYear} onChange={(v) => setForm((p) => ({ ...p, foundedYear: v }))} placeholder="e.g. 1998" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Website</label>
                  <input className="form-input" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://example.com" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <hr style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0 1rem' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Contact & Locations</h4>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Contact Person</label>
                  <input className="form-input" value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Full Name" />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input className="form-input" type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="email@company.com" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Login email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={profile.accountEmailRaw}
                    disabled
                    readOnly
                    style={{ opacity: 0.85 }}
                  />
                  <span className="form-hint">Used to sign in. To change it, contact your administrator.</span>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Communication email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.communicationEmail}
                    onChange={(e) => setForm((p) => ({ ...p, communicationEmail: e.target.value }))}
                    placeholder={profile.accountEmailRaw ? `Leave empty to use ${profile.accountEmailRaw}` : 'you@company.com'}
                  />
                  <span className="form-hint">
                    Receives system messages such as sponsorship thank-you and tax receipts. If empty, mail goes to your login email.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="+1 234 567 8900" />
                </div>

                <div className="form-group">
                  <label className="form-label">Global Headquarters</label>
                  <input className="form-input" value={form.headquarters} onChange={(e) => setForm((p) => ({ ...p, headquarters: e.target.value }))} placeholder="City, Country" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">All Office Locations</label>
                  <input className="form-input" value={form.locations} onChange={(e) => setForm((p) => ({ ...p, locations: e.target.value }))} placeholder="Comma separated list of cities" />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <hr style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0 1rem' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Sponsorship receipts (legal / tax)</h4>
                  <p className="text-xs text-secondary" style={{ margin: '0 0 1rem', lineHeight: 1.45 }}>
                    Used when colleges email donation or sponsorship acknowledgments. PAN: AAAAA9999A. GSTIN: 15 characters.
                  </p>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Legal name</label>
                  <input
                    className="form-input"
                    value={form.billingLegalName}
                    onChange={(e) => setForm((p) => ({ ...p, billingLegalName: e.target.value }))}
                    placeholder="Registered name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input
                    className="form-input"
                    value={form.billingPan}
                    onChange={(e) => setForm((p) => ({ ...p, billingPan: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input
                    className="form-input"
                    value={form.billingGstNumber}
                    onChange={(e) => setForm((p) => ({ ...p, billingGstNumber: e.target.value.toUpperCase() }))}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-surface)' }}>
              <button className="btn btn-secondary" onClick={toggleEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
