'use client';

import { useEffect, useState } from 'react';
import EntityLogo from '@/components/EntityLogo';
import { appendClientDebugLog } from '@/lib/clientDebugLog';
import { inferImageContentType } from '@/lib/inferImageContentType';
import {
  IconTwitter,
  IconFacebook,
  IconInstagram,
  IconLinkedIn,
} from '@/components/SocialIcons';

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
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    website: '',
    logoUrl: '',
    websiteApi: '',
    placementSeasonLabel: '',
    social: { twitter: '', facebook: '', instagram: '', linkedin: '' },
    institution: { collegeName: '', email: '', phone: '' },
    address: { address: '', city: '', state: '', pincode: '' },
    accreditation: { body: '', naacGrade: '', nirfRank: '' },
    placementOfficer: { name: '', email: '', designation: '' },
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
          institution: json.institution || { collegeName: '', email: '', phone: '' },
          address: json.address || { address: '', city: '', state: '', pincode: '' },
          accreditation: json.accreditation || { body: '', naacGrade: '', nirfRank: '' },
          placementOfficer: json.placementOfficer || { name: '', email: '', designation: '' },
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

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      setMessage('No file selected.');
      return;
    }
    const contentType = inferImageContentType(file);
    if (!contentType) {
      setMessage('Please choose a JPEG, PNG, WebP, or GIF image (your browser did not report a usable type).');
      appendClientDebugLog({
        source: 'college_settings_logo',
        action: 'reject_type',
        fileName: file.name,
        reportedType: file.type || null,
      });
      return;
    }
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
    <div className="animate-fadeIn college-settings-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🔧 College Settings</h1>
          <p>Manage your institution&apos;s profile and preferences</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving || loading}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      {message ? (
        <div
          className="wireframe-banner"
          style={{
            marginBottom: '1.5rem',
            ...(message.includes('successfully') ? {} : { borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }),
          }}
          role={message.includes('successfully') ? 'status' : 'alert'}
          aria-live="polite"
        >
          <span className="badge badge-gray" style={{ flexShrink: 0 }}>Status</span>
          <div>{message}</div>
        </div>
      ) : null}

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
            <label className="form-label">Placement season (display)</label>
            <input
              className="form-input"
              placeholder="e.g. 2025-26"
              value={form.placementSeasonLabel}
              onChange={(e) => setRoot('placementSeasonLabel', e.target.value)}
            />
            <p className="text-xs text-tertiary" style={{ margin: 0 }}>
              Shown on the college dashboard and top bar. Leave blank to use the session year only.
            </p>
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">College Name</label>
            <input className="form-input" value={form.institution.collegeName} onChange={(e) => setNested('institution', 'collegeName', e.target.value)} />
          </div>
          <div className="form-group college-settings-inline">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.institution.email} onChange={(e) => setNested('institution', 'email', e.target.value)} />
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
            <input className="form-input" type="number" value={form.accreditation.nirfRank} onChange={(e) => setNested('accreditation', 'nirfRank', e.target.value)} />
          </div>
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
      </div>
    </div>
  );
}
