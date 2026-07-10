'use client';

import { useEffect, useState } from 'react';
import EntityLogo from '@/components/EntityLogo';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { validateImageFileContent } from '@/lib/inferImageContentType';
import {
  IconTwitter,
  IconFacebook,
  IconInstagram,
  IconLinkedIn,
} from '@/components/SocialIcons';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validators';
import AcademicTaxonomySettingsPanel from '@/components/college/AcademicTaxonomySettingsPanel';

function LabelWithIcon({ Icon, children }) {
  return (
    <span className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ flexShrink: 0, opacity: 0.85, display: 'inline-flex' }} aria-hidden>
        <Icon size={16} />
      </span>
      {children}
    </span>
  );
}

export default function CollegeSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [form, setForm] = useState({
    website: '',
    logoUrl: '',
    websiteApi: '',
    placementSeasonLabel: '',
    social: { twitter: '', facebook: '', instagram: '', linkedin: '' },
    institution: { collegeName: '', email: '', communicationEmail: '', phone: '' },
    address: { address: '', city: '', state: '', pincode: '' },
    accreditation: { body: '', naacGrade: '', nirfRank: '' },
    institutionShowcase: {
      nbaAccreditedPrograms: '',
      nirfCategoryRanks: '',
      notableAlumni: '',
      patentCount: '',
      startupCount: '',
      incubationCells: '',
      researchCenters: '',
    },
    placementOfficer: { name: '', email: '', designation: '' },
    requireCvVerification: false,
    delegateCvVerificationToCommittee: false,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/college/settings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        if (!mounted) return;
        setForm({
          website: json.website || '',
          logoUrl: json.logoUrl || '',
          websiteApi: json.websiteApi || '',
          placementSeasonLabel: json.placementSeasonLabel || '',
          social: json.social || { twitter: '', facebook: '', instagram: '', linkedin: '' },
          institution: json.institution || { collegeName: '', email: '', communicationEmail: '', phone: '' },
          address: json.address || { address: '', city: '', state: '', pincode: '' },
          accreditation: json.accreditation || { body: '', naacGrade: '', nirfRank: '' },
          institutionShowcase: json.institutionShowcase || {
            nbaAccreditedPrograms: '',
            nirfCategoryRanks: '',
            notableAlumni: '',
            patentCount: '',
            startupCount: '',
            incubationCells: '',
            researchCenters: '',
          },
          placementOfficer: json.placementOfficer || { name: '', email: '', designation: '' },
          requireCvVerification: Boolean(json.requireCvVerification),
          delegateCvVerificationToCommittee: Boolean(json.delegateCvVerificationToCommittee),
        });
      } catch (e) {
        if (!mounted) return;
        setMessage(e.message || 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setRoot = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setNested = (root, key, value) =>
    setForm((prev) => ({ ...prev, [root]: { ...prev[root], [key]: value } }));

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/college/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save settings');
      setMessage('Settings saved successfully.');
    } catch (e) {
      setMessage(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
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
      if (!res.ok) throw new Error(json?.error || 'Failed to change password');
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      setMessage('No file selected.');
      return;
    }
    const imageCheck = await validateImageFileContent(file);
    if (!imageCheck.ok) {
      setMessage(imageCheck.error);
      appendClientDebugLog({
        source: 'college_settings_logo',
        action: 'reject_type',
        fileName: file.name,
        reportedType: file.type || null,
      });
      return;
    }
    const contentType = imageCheck.contentType;
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Logo image too large (max 2MB).');
      return;
    }
    setLogoUploading(true);
    setMessage('');
    try {
      appendClientDebugLog({
        source: 'college_settings_logo',
        action: 'presign_request',
        fileName: file.name,
        contentType,
        fileSize: file.size,
      });
      const presignRes = await fetch('/api/college/settings/logo/presign', {
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
        source: 'college_settings_logo',
        action: 'presign_response',
        status: presignRes.status,
        ok: presignRes.ok,
        error: presign.error || null,
      });
      if (presignRes.status === 503) {
        throw new Error(
          presign?.error
            ? `${presign.error}. Add AWS_REGION, S3_BUCKET_NAME, and IAM keys to your Vercel env, then redeploy.`
            : 'Logo storage is not configured. Add S3/AWS environment variables on the server and redeploy.',
        );
      }
      if (!presignRes.ok) {
        throw new Error(presign?.error || `Could not start upload (HTTP ${presignRes.status}).`);
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
        source: 'college_settings_logo',
        action: 's3_put',
        status: putRes.status,
        ok: putRes.ok,
      });
      if (!putRes.ok) {
        throw new Error(
          `Upload to storage failed (HTTP ${putRes.status}). Often this is S3 bucket CORS: allow PUT from ${typeof window !== 'undefined' ? window.location.origin : 'your site'} and headers Content-Type. ${putDetail ? `Details: ${putDetail.slice(0, 200)}` : ''}`.trim(),
        );
      }

      const completeRes = await fetch('/api/college/settings/logo/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: presign.fileUrl }),
      });
      const complete = await completeRes.json().catch(() => ({}));
      appendClientDebugLog({
        source: 'college_settings_logo',
        action: 'complete',
        status: completeRes.status,
        ok: completeRes.ok,
        error: complete.error || null,
      });
      if (!completeRes.ok) throw new Error(complete?.error || 'Failed to save uploaded logo URL to your college profile.');

      setForm((prev) => ({ ...prev, logoUrl: presign.fileUrl }));
      setMessage('Logo uploaded successfully.');
      appendClientDebugLog({ source: 'college_settings_logo', action: 'success', fileUrl: presign.fileUrl });
    } catch (e2) {
      const msg = e2.message || 'Logo upload failed';
      setMessage(msg);
      appendClientDebugLog({ source: 'college_settings_logo', action: 'error', message: msg });
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="animate-fadeIn college-settings-page" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>🔧 College Settings</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Manage your institution&apos;s profile, branding, and preferences.</p>
        </div>
        <button type="button" className="btn banner-cta-solid" onClick={onSave} disabled={saving || loading} style={{ position: 'relative', zIndex: 1 }}>
          {saving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      {message && (
        <div
          className="wireframe-banner"
          style={{ marginBottom: '1.5rem', ...(message.includes('successfully') ? {} : { borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }) }}
          role={message.includes('successfully') ? 'status' : 'alert'}
          aria-live="polite"
        >
          <span className="badge badge-gray" style={{ flexShrink: 0 }}>Status</span>
          <div>{message}</div>
        </div>
      )}

      <AcademicTaxonomySettingsPanel />

      <div className="grid grid-2">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">🌐 Website &amp; social profile URLs</h3>
            <span className="badge badge-green">Live</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <EntityLogo name={form.institution.collegeName || 'College'} logoUrl={form.logoUrl} website={form.website} size="lg" shape="rounded" />
            <label className={`btn btn-secondary btn-sm${logoUploading ? ' disabled' : ''}`} style={{ cursor: logoUploading ? 'wait' : 'pointer', margin: 0 }}>
              {logoUploading ? 'Uploading logo…' : 'Upload college logo'}
              <input type="file" accept="image/*" hidden disabled={logoUploading} onChange={onLogoChange} />
            </label>
          </div>
          <p className="text-sm text-secondary" style={{ marginTop: 0 }}>
            Public website, optional API root for integrations, and official college accounts on X (Twitter), Facebook, Instagram, and LinkedIn.
          </p>
          <div className="grid grid-2" style={{ gap: '1rem 1.5rem' }}>
            <div className="form-group college-settings-inline">
              <label className="form-label">Public website URL</label>
              <input className="form-input" type="url" placeholder="https://www.college.edu" value={form.website} onChange={(e) => setRoot('website', e.target.value)} />
            </div>
            <div className="form-group college-settings-inline">
              <label className="form-label">Logo URL (optional)</label>
              <input className="form-input" type="url" placeholder="https://.../logo.png" value={form.logoUrl} onChange={(e) => setRoot('logoUrl', e.target.value)} />
            </div>
            <div className="form-group college-settings-inline">
              <label className="form-label">Website API base URL</label>
              <div className="college-settings-field-grow">
                <input className="form-input" type="url" placeholder="https://api.college.edu/v1" value={form.websiteApi} onChange={(e) => setRoot('websiteApi', e.target.value)} />
                <p className="text-xs text-tertiary" style={{ margin: 0 }}>
                  Optional — for CMS, events API, or automation.
                </p>
              </div>
            </div>
            <div className="form-group college-settings-inline">
              <LabelWithIcon Icon={IconTwitter}>Twitter / X URL</LabelWithIcon>
              <input className="form-input" type="url" placeholder="https://twitter.com/your_college or https://x.com/your_college" value={form.social.twitter} onChange={(e) => setNested('social', 'twitter', e.target.value)} />
            </div>
            <div className="form-group college-settings-inline">
              <LabelWithIcon Icon={IconFacebook}>Facebook URL</LabelWithIcon>
              <input className="form-input" type="url" placeholder="https://facebook.com/your.college" value={form.social.facebook} onChange={(e) => setNested('social', 'facebook', e.target.value)} />
            </div>
            <div className="form-group college-settings-inline">
              <LabelWithIcon Icon={IconInstagram}>Instagram URL</LabelWithIcon>
              <input className="form-input" type="url" placeholder="https://instagram.com/your_college" value={form.social.instagram} onChange={(e) => setNested('social', 'instagram', e.target.value)} />
            </div>
            <div className="form-group college-settings-inline">
              <LabelWithIcon Icon={IconLinkedIn}>LinkedIn URL</LabelWithIcon>
              <input className="form-input" type="url" placeholder="https://linkedin.com/school/your-college" value={form.social.linkedin} onChange={(e) => setNested('social', 'linkedin', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏫 Institution Details</h3>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Academic year (display override)</label>
            <input
              className="form-input"
              placeholder="e.g. 2025-26"
              value={form.placementSeasonLabel}
              onChange={(e) => setRoot('placementSeasonLabel', e.target.value)}
            />
            <p className="text-xs text-tertiary" style={{ margin: 0 }}>
              Optional legacy override. The top bar defaults to the academic year for today&apos;s date.
            </p>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">College Name</label>
            <input className="form-input" value={form.institution.collegeName} onChange={(e) => setNested('institution', 'collegeName', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.institution.email} onChange={(e) => setNested('institution', 'email', e.target.value)} />
            <p className="text-xs text-tertiary" style={{ margin: 0 }}>
              Primary institution contact on your public profile.
            </p>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Communication email</label>
            <input
              className="form-input"
              type="email"
              placeholder="placement-notifications@college.edu"
              value={form.institution.communicationEmail}
              onChange={(e) => setNested('institution', 'communicationEmail', e.target.value)}
            />
            <p className="text-xs text-tertiary" style={{ margin: 0 }}>
              Used for employer coordination, sponsorship receipts, and system mail when it differs from the primary email.
            </p>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.institution.phone} onChange={(e) => setNested('institution', 'phone', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📍 Address</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={form.address.address} onChange={(e) => setNested('address', 'address', e.target.value)} rows={3} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">City</label>
            <input className="form-input" value={form.address.city} onChange={(e) => setNested('address', 'city', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">State</label>
            <input className="form-input" value={form.address.state} onChange={(e) => setNested('address', 'state', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Pincode</label>
            <input className="form-input" value={form.address.pincode} onChange={(e) => setNested('address', 'pincode', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏆 Accreditation</h3>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Accreditation Body</label>
            <input className="form-input" value={form.accreditation.body} onChange={(e) => setNested('accreditation', 'body', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">NAAC Grade</label>
            <select className="form-select" value={form.accreditation.naacGrade} onChange={(e) => setNested('accreditation', 'naacGrade', e.target.value)}>
              <option value="">— Not specified —</option>
              <option>A++</option>
              <option>A+</option>
              <option>A</option>
              <option>B++</option>
              <option>B+</option>
              <option>B</option>
            </select>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">NIRF Rank</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_NIRF_RANK} value={form.accreditation.nirfRank} onChange={(v) => setNested('accreditation', 'nirfRank', v)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Institution Showcase</h3>
          </div>
          <p className="text-sm text-secondary" style={{ marginTop: 0 }}>
            These are commonly highlighted on college pages: rankings, alumni outcomes, innovation, startups, patents, and research centers.
          </p>
          <div className="form-group college-settings-inline">
            <label className="form-label">NBA Accredited Programs</label>
            <input
              className="form-input"
              placeholder="e.g. CSE, ECE, Mechanical (Tier-1)"
              value={form.institutionShowcase.nbaAccreditedPrograms}
              onChange={(e) => setNested('institutionShowcase', 'nbaAccreditedPrograms', e.target.value)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">NIRF Category Ranks</label>
            <input
              className="form-input"
              placeholder="e.g. Overall #1, Engineering #1, Innovation #2"
              value={form.institutionShowcase.nirfCategoryRanks}
              onChange={(e) => setNested('institutionShowcase', 'nirfCategoryRanks', e.target.value)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Notable Alumni</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Comma-separated names and achievements"
              value={form.institutionShowcase.notableAlumni}
              onChange={(e) => setNested('institutionShowcase', 'notableAlumni', e.target.value)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Total Patents (latest)</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.COLLEGE_PATENT_COUNT}
              context={{ label: 'Patent count' }}
              value={form.institutionShowcase.patentCount}
              onChange={(v) => setNested('institutionShowcase', 'patentCount', v)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Startups Incubated</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.COLLEGE_STARTUP_COUNT}
              context={{ label: 'Startup count' }}
              value={form.institutionShowcase.startupCount}
              onChange={(v) => setNested('institutionShowcase', 'startupCount', v)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Incubation Cells / Entrepreneurship Hubs</label>
            <input
              className="form-input"
              placeholder="e.g. IITM Incubation Cell, Research Park"
              value={form.institutionShowcase.incubationCells}
              onChange={(e) => setNested('institutionShowcase', 'incubationCells', e.target.value)}
            />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Research Centers of Excellence</label>
            <input
              className="form-input"
              placeholder="e.g. AI, Energy, Semiconductor systems"
              value={form.institutionShowcase.researchCenters}
              onChange={(e) => setNested('institutionShowcase', 'researchCenters', e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📄 CV Verification</h3>
          </div>
          <p className="text-sm text-secondary" style={{ marginTop: 0 }}>
            When enabled, students must have a college-verified CV before applying to placement drives and internships.
          </p>
          <label className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
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
            <span>
              <span className="form-label" style={{ display: 'block', marginBottom: '0.15rem' }}>
                Require verified CV for drives &amp; internships
              </span>
              <span className="text-xs text-tertiary">
                Each uploaded CV can be marked verified individually on the student profile.
              </span>
            </span>
          </label>
          <label
            className="form-group"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
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
            <span>
              <span className="form-label" style={{ display: 'block', marginBottom: '0.15rem' }}>
                Delegate verification to Placement Committee
              </span>
              <span className="text-xs text-tertiary">
                Placement committee members can mark CVs verified when this is on; college admins always can.
              </span>
            </span>
          </label>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👤 Placement Officer</h3>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.placementOfficer.name} onChange={(e) => setNested('placementOfficer', 'name', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.placementOfficer.email} onChange={(e) => setNested('placementOfficer', 'email', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Designation</label>
            <input
              className="form-input"
              placeholder="e.g. Training &amp; Placement Officer"
              value={form.placementOfficer.designation}
              onChange={(e) => setNested('placementOfficer', 'designation', e.target.value)}
            />
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">🔐 Password</h3>
          </div>
          <p className="text-sm text-secondary" style={{ marginTop: 0 }}>
            Change your login password from settings.
          </p>
          <form onSubmit={onChangePassword} style={{ display: 'grid', gap: '0.9rem' }}>
            <div className="grid grid-3" style={{ gap: '0.9rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
                <span className="form-hint">{PASSWORD_REQUIREMENTS_HINT}</span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm new password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-secondary" disabled={passwordSaving}>
                {passwordSaving ? 'Updating...' : 'Update password'}
              </button>
              {passwordMessage ? <span className="text-sm text-secondary">{passwordMessage}</span> : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
