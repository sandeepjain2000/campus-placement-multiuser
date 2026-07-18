'use client';
import { useEffect, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { useSession } from 'next-auth/react';
import MobileHeader from '@/components/mobile/MobileHeader';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { useToast } from '@/components/ToastProvider';
import { Save, Building2, MapPin, Award, UserCircle, Globe, Shield, Camera } from 'lucide-react';
import AcademicTaxonomySettingsPanel from '@/components/college/AcademicTaxonomySettingsPanel';
import EntityLogo from '@/components/EntityLogo';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { validateImageFileContent } from '@/lib/inferImageContentType';
import { isBrowserLoadableAssetUrl } from '@/lib/clientAssetUrl';
import { pickBrowserAssetUrl } from '@/lib/resolveBrandLogoUrl';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';

export default function mb_Settings() {
  const { update: updateSession } = useSession();
  const { addToast } = useToast();
  const logoInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form, setForm] = useState({
    website: '', logoUrl: '', websiteApi: '', placementSeasonLabel: '',
    social: { twitter: '', facebook: '', instagram: '', linkedin: '' },
    institution: { collegeName: '', email: '', communicationEmail: '', phone: '' },
    address: { address: '', city: '', state: '', pincode: '' },
    accreditation: { body: '', naacGrade: '', nirfRank: '' },
    institutionShowcase: {
      nbaAccreditedPrograms: '', nirfCategoryRanks: '', notableAlumni: '', 
      patentCount: '', startupCount: '', incubationCells: '', researchCenters: ''
    },
    placementOfficer: { name: '', email: '', designation: '' },
    requireCvVerification: false,
    delegateCvVerificationToCommittee: false,
  });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/college/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setForm(prev => ({
          ...prev,
          ...json,
          requireCvVerification: Boolean(json.requireCvVerification),
          delegateCvVerificationToCommittee: Boolean(json.delegateCvVerificationToCommittee),
        }));
      } catch (e) {
        if (!mounted) return;
        addToast(e.message || 'Failed to load settings', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [addToast]);

  const setRoot = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const setNested = (root, key, value) => setForm(p => ({ ...p, [root]: { ...p[root], [key]: value } }));

  const refreshBrandLogo = async (logoUrl) => {
    const safe = pickBrowserAssetUrl(logoUrl);
    await Promise.all([
      globalMutate('/api/college/settings'),
      safe ? updateSession?.({ brandLogoUrl: safe }) : updateSession?.({ brandLogoUrl: null }),
    ]);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const logoUrlRaw = String(form.logoUrl || '').trim();
      if (logoUrlRaw && !isBrowserLoadableAssetUrl(logoUrlRaw)) {
        throw new Error(
          'Logo URL must be a web address (https://…) or site path (/…). Use Upload college logo instead of a file path on your computer.',
        );
      }
      const res = await fetch('/api/college/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logoUrl: logoUrlRaw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings');
      setForm((prev) => ({ ...prev, logoUrl: logoUrlRaw }));
      await refreshBrandLogo(logoUrlRaw);
      addToast('Settings saved successfully', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
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
      addToast('Logo image too large (max 2MB).', 'warning');
      return;
    }
    setLogoUploading(true);
    try {
      const presignRes = await fetch('/api/college/settings/logo/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      if (presignRes.status === 503) {
        throw new Error(
          presign?.error
            ? `${presign.error}. Add AWS_REGION, S3_BUCKET_NAME, and IAM keys to your env, then redeploy.`
            : 'Logo storage is not configured.',
        );
      }
      if (!presignRes.ok) throw new Error(presign?.error || 'Could not start upload.');

      const ph = {};
      if (presign.contentType) ph['Content-Type'] = String(presign.contentType).split(';')[0].trim();
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: ph, body: file });
      if (!putRes.ok) throw new Error('Upload to storage failed.');

      const completeRes = await fetch('/api/college/settings/logo/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: presign.fileUrl }),
      });
      const complete = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) throw new Error(complete?.error || 'Failed to save uploaded logo.');

      const nextLogoUrl = String(presign.fileUrl || '').trim();
      setForm((prev) => ({ ...prev, logoUrl: nextLogoUrl || prev.logoUrl }));
      await refreshBrandLogo(nextLogoUrl);
      addToast('College logo updated.', 'success');
      appendClientDebugLog({ source: 'college_settings_logo_mobile', action: 'success', fileUrl: nextLogoUrl });
    } catch (err) {
      addToast(err?.message || 'Logo upload failed', 'error');
      appendClientDebugLog({ source: 'college_settings_logo_mobile', action: 'error', message: err?.message });
    } finally {
      setLogoUploading(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      addToast('Please fill all password fields.', 'warning');
      return;
    }
    const passwordErr = getPasswordValidationError(passwordForm.newPassword);
    if (passwordErr) {
      addToast(passwordErr, 'warning');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
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
      if (!res.ok) throw new Error('Failed to change password');
      addToast('Password updated successfully.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const sections = [
    { id: 'general', label: 'General', icon: <Building2 size={16} /> },
    { id: 'address', label: 'Address', icon: <MapPin size={16} /> },
    { id: 'academics', label: 'Academics', icon: <Award size={16} /> },
    { id: 'social', label: 'Social & Web', icon: <Globe size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> }
  ];

  return (
    <>
      <MobileHeader 
        title="Settings" 
        action={
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving || loading}>
            <Save size={16} /> {saving ? '...' : 'Save'}
          </button>
        }
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.75rem', marginBottom: '1rem', scrollbarWidth: 'none' }}>
          {sections.map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`btn ${activeSection === s.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '999px', whiteSpace: 'nowrap', padding: '0.4rem 1rem', fontSize: '0.8rem', flexShrink: 0, border: activeSection !== s.id ? '1px solid var(--border-default)' : 'none', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: '8px' }} />)}
          </div>
        ) : (
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)' }}>
            
            {activeSection === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <EntityLogo name={form.institution.collegeName || 'College'} logoUrl={form.logoUrl} website={form.website} size="lg" shape="rounded" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>College Logo</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      hidden
                      disabled={logoUploading}
                      onChange={onLogoChange}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', alignSelf: 'flex-start' }}
                    >
                      <Camera size={14} />
                      {logoUploading ? 'Uploading…' : 'Upload logo'}
                    </button>
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Logo URL (optional)</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://… or /logos/…"
                    value={form.logoUrl}
                    onChange={(e) => setRoot('logoUrl', e.target.value)}
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">College Name</label>
                  <input className="form-input" value={form.institution.collegeName} onChange={(e) => setNested('institution', 'collegeName', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Academic year (display override)</label>
                  <input className="form-input" placeholder="e.g. 2025-26" value={form.placementSeasonLabel} onChange={(e) => setRoot('placementSeasonLabel', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Primary Email</label>
                  <input className="form-input" type="email" value={form.institution.email} onChange={(e) => setNested('institution', 'email', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Phone</label>
                  <input className="form-input" value={form.institution.phone} onChange={(e) => setNested('institution', 'phone', e.target.value)} />
                </div>

                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-default)' }} />
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem' }}>CV Verification</h4>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.requireCvVerification)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        requireCvVerification: checked,
                        delegateCvVerificationToCommittee: checked ? prev.delegateCvVerificationToCommittee : false,
                      }));
                    }}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span className="text-xs">Require verified CV for drives &amp; internships</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'flex-start',
                    cursor: form.requireCvVerification ? 'pointer' : 'not-allowed',
                    opacity: form.requireCvVerification ? 1 : 0.55,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={!form.requireCvVerification}
                    checked={Boolean(form.delegateCvVerificationToCommittee)}
                    onChange={(e) => setRoot('delegateCvVerificationToCommittee', e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span className="text-xs">Delegate CV verification to Placement Committee</span>
                </label>
                
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-default)' }} />
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserCircle size={16} /> Placement Officer</h4>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Name</label>
                  <input className="form-input" value={form.placementOfficer.name} onChange={(e) => setNested('placementOfficer', 'name', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Email</label>
                  <input className="form-input" type="email" value={form.placementOfficer.email} onChange={(e) => setNested('placementOfficer', 'email', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Designation</label>
                  <input className="form-input" value={form.placementOfficer.designation} onChange={(e) => setNested('placementOfficer', 'designation', e.target.value)} />
                </div>
              </div>
            )}

            {activeSection === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Street Address</label>
                  <textarea className="form-textarea" rows={3} value={form.address.address} onChange={(e) => setNested('address', 'address', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">City</label>
                  <input className="form-input" value={form.address.city} onChange={(e) => setNested('address', 'city', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">State</label>
                    <input className="form-input" value={form.address.state} onChange={(e) => setNested('address', 'state', e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">Pincode</label>
                    <input className="form-input" value={form.address.pincode} onChange={(e) => setNested('address', 'pincode', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'academics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <AcademicTaxonomySettingsPanel />
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-default)' }} />
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Accreditation Body</label>
                  <input className="form-input" value={form.accreditation.body} onChange={(e) => setNested('accreditation', 'body', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">NAAC Grade</label>
                    <select className="form-select" value={form.accreditation.naacGrade} onChange={(e) => setNested('accreditation', 'naacGrade', e.target.value)}>
                      <option value="">—</option><option>A++</option><option>A+</option><option>A</option><option>B++</option><option>B+</option><option>B</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">NIRF Rank</label>
                    <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_NIRF_RANK} value={form.accreditation.nirfRank} onChange={(v) => setNested('accreditation', 'nirfRank', v)} />
                  </div>
                </div>
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-default)' }} />
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem' }}>Showcase Metrics</h4>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Notable Alumni</label>
                  <input className="form-input" value={form.institutionShowcase.notableAlumni} onChange={(e) => setNested('institutionShowcase', 'notableAlumni', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">Patents</label>
                    <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_PATENT_COUNT} context={{ label: 'Patent count' }} value={form.institutionShowcase.patentCount} onChange={(v) => setNested('institutionShowcase', 'patentCount', v)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-xs text-secondary mb-1 block">Startups</label>
                    <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_STARTUP_COUNT} context={{ label: 'Startup count' }} value={form.institutionShowcase.startupCount} onChange={(v) => setNested('institutionShowcase', 'startupCount', v)} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'social' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Public Website</label>
                  <input className="form-input" type="url" value={form.website} onChange={(e) => setRoot('website', e.target.value)} />
                </div>
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-default)' }} />
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem' }}>Social Handles</h4>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">LinkedIn</label>
                  <input className="form-input" type="url" value={form.social.linkedin} onChange={(e) => setNested('social', 'linkedin', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Twitter / X</label>
                  <input className="form-input" type="url" value={form.social.twitter} onChange={(e) => setNested('social', 'twitter', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Instagram</label>
                  <input className="form-input" type="url" value={form.social.instagram} onChange={(e) => setNested('social', 'instagram', e.target.value)} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Facebook</label>
                  <input className="form-input" type="url" value={form.social.facebook} onChange={(e) => setNested('social', 'facebook', e.target.value)} />
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <form onSubmit={onChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Current Password</label>
                  <input className="form-input" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">New Password</label>
                  <input className="form-input" type="password" minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
                  <span className="form-hint" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{PASSWORD_REQUIREMENTS_HINT}</span>
                </div>
                <div className="form-group mb-0">
                  <label className="text-xs text-secondary mb-1 block">Confirm New Password</label>
                  <input className="form-input" type="password" minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving} style={{ marginTop: '0.5rem' }}>
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}

          </div>
        )}
      </div>
    </>
  );
}
