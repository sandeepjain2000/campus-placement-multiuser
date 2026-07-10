'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { getInitials } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { ProfileLinkKindIcon } from '@/components/ProfileLinkKindIcon';
import { defaultStudentProfile } from '@/lib/studentProfileStorage';

const LINK_KINDS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'website', label: 'Website' },
  { value: 'project', label: 'Project / portfolio' },
  { value: 'other', label: 'Other' },
];

function newLinkId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `l-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Omit local-only / large fields from API save payload. */
function profilePutBody(p) {
  return {
    department: p.department,
    branch: p.branch,
    batchYear: p.batchYear,
    graduationYear: p.graduationYear,
    cgpa: p.cgpa,
    tenthPercentage: p.tenthPercentage,
    twelfthPercentage: p.twelfthPercentage,
    gender: p.gender,
    bio: p.bio,
    skills: p.skills,
    expectedSalaryMin: p.expectedSalaryMin,
    expectedSalaryMax: p.expectedSalaryMax,
    preferredLocations: p.preferredLocations,
    willingToRelocate: p.willingToRelocate,
    profileLinks: p.profileLinks,
    phones: p.phones,
    emails: p.emails,
  };
}

export default function StudentProfilePage() {
  const { data: session, status, update } = useSession();
  const { addToast } = useToast();
  const email = session?.user?.email || '';
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState(() => defaultStudentProfile(session?.user));

  const loadProfileFromApi = useCallback(
    async (opts) => {
      const silent = Boolean(opts?.silent);
      if (!email) {
        setProfile(defaultStudentProfile(session?.user));
        if (!silent) setProfileLoading(false);
        return;
      }
      if (!silent) setProfileLoading(true);
      try {
        const res = await fetch('/api/student/profile');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(data.hint ? `${data.error || 'Error'}: ${data.hint}` : data.error || 'Could not load profile', 'warning');
          setProfile(defaultStudentProfile(session?.user));
          return;
        }
        if (data.profile) setProfile(data.profile);
      } catch {
        addToast('Could not load profile (network).', 'warning');
        setProfile(defaultStudentProfile(session?.user));
      } finally {
        if (!silent) setProfileLoading(false);
      }
    },
    [addToast, email, session?.user]
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.role !== 'student') {
      setProfileLoading(false);
      return;
    }
    loadProfileFromApi();
  }, [status, session?.user?.role, loadProfileFromApi]);

  const persist = useCallback((next) => {
    setProfile(next);
  }, []);

  const handleSave = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePutBody(profile)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data.hint ? `${data.error || 'Save failed'}: ${data.hint}` : data.error || 'Save failed', 'warning');
        return;
      }
      if (data.profile) setProfile(data.profile);
      setEditing(false);
      addToast('Profile saved.', 'success');
    } catch {
      addToast('Save failed (network).', 'warning');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const skills = profile.skills || [];
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      persist({ ...profile, skills: [...skills, newSkill.trim()] });
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    const skills = profile.skills || [];
    persist({ ...profile, skills: skills.filter((s) => s !== skillToRemove) });
  };

  const addProfileLink = () => {
    const prevLinks = profile.profileLinks || [];
    persist({
      ...profile,
      profileLinks: [...prevLinks, { id: newLinkId(), kind: 'website', url: '', title: '', description: '' }],
    });
  };

  const updateLink = (id, patch) => {
    const prevLinks = profile.profileLinks || [];
    persist({
      ...profile,
      profileLinks: prevLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const removeLink = (id) => {
    const prevLinks = profile.profileLinks || [];
    persist({ ...profile, profileLinks: prevLinks.filter((l) => l.id !== id) });
  };

  const addPhone = () => {
    persist({
      ...profile,
      phones: [...(profile.phones || []), { label: 'Other', value: '' }],
    });
  };

  const updatePhone = (index, patch) => {
    const phones = [...(profile.phones || [])];
    phones[index] = { ...phones[index], ...patch };
    persist({ ...profile, phones });
  };

  const removePhone = (index) => {
    const phones = [...(profile.phones || [])];
    phones.splice(index, 1);
    persist({ ...profile, phones: phones.length ? phones : [{ label: 'Primary', value: '' }] });
  };

  const addEmailRow = () => {
    persist({
      ...profile,
      emails: [...(profile.emails || []), { label: 'Other', value: '' }],
    });
  };

  const updateEmailRow = (index, patch) => {
    const emails = [...(profile.emails || [])];
    emails[index] = { ...emails[index], ...patch };
    persist({ ...profile, emails });
  };

  const removeEmailRow = (index) => {
    const emails = [...(profile.emails || [])];
    emails.splice(index, 1);
    persist({
      ...profile,
      emails: emails.length ? emails : [{ label: 'College', value: email }],
    });
  };

  const persistLocalAvatarDataUrl = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === 'string' && dataUrl.length > 1_200_000) {
          addToast('Image too large for offline storage. Use a smaller file (~900KB) or configure S3.', 'warning');
          return;
        }
        setProfile((prev) => ({
          ...prev,
          avatarDataUrl: typeof dataUrl === 'string' ? dataUrl : '',
          avatarUrl: '',
          avatarName: file.name,
        }));
        addToast('Photo saved in this browser only (S3 not configured).', 'info');
      };
      reader.readAsDataURL(file);
    },
    [addToast],
  );

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    const maxS3 = 2 * 1024 * 1024;
    if (file.size > maxS3) {
      addToast('Image too large (max 2MB).', 'warning');
      return;
    }

    setAvatarUploading(true);
    try {
      const presignRes = await fetch('/api/student/profile/avatar/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      });
      const presign = await presignRes.json();

      if (presignRes.status === 503 && presign.error === 'S3 not configured') {
        persistLocalAvatarDataUrl(file);
        return;
      }
      if (!presignRes.ok) {
        addToast(presign.error + (presign.hint ? ` — ${presign.hint}` : ''), 'warning');
        return;
      }

      const ph = {};
      if (presign.contentType) {
        ph['Content-Type'] = String(presign.contentType).split(';')[0].trim();
      }
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: ph, body: file });
      if (!putRes.ok) {
        const raw = (await putRes.text()).replace(/\s+/g, ' ').trim();
        const code = (raw.match(/<Code>([^<]+)<\/Code>/) || [])[1];
        const msg = (raw.match(/<Message>([^<]+)<\/Message>/) || [])[1];
        const hint = code || msg ? `${code || 'Error'}${msg ? `: ${msg}` : ''}` : raw.slice(0, 140);
        addToast(`Photo upload failed (${putRes.status}). ${hint || 'Check CORS and IAM.'}`, 'warning');
        return;
      }

      const completeRes = await fetch('/api/student/profile/avatar/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: presign.fileUrl }),
      });
      const complete = await completeRes.json();
      if (!completeRes.ok) {
        addToast(complete.error || 'File uploaded but profile could not be updated', 'warning');
        return;
      }

      setProfile((prev) => ({
        ...prev,
        avatarUrl: presign.fileUrl,
        avatarDataUrl: '',
        avatarName: file.name,
      }));
      await update({ avatar: presign.fileUrl });
      addToast('Photo saved to cloud storage.', 'info');
    } catch {
      addToast('Upload failed (network).', 'warning');
    } finally {
      setAvatarUploading(false);
    }
  };

  const onCvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    persist({ ...profile, cvFileName: file.name, cvDataUrl: '' });
  };

  const displayPhones = profile.phones?.length ? profile.phones : [{ label: 'Primary', value: profile.phone || '' }];
  const displayEmails = profile.emails?.length
    ? profile.emails
    : [
        { label: 'College', value: profile.collegeEmail || email },
        { label: 'Personal', value: profile.personalEmail || '' },
      ];

  const locList = (profile.preferredLocations || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const avatarSrc = profile.avatarUrl || profile.avatarDataUrl || session?.user?.avatar || '';
  const skillsList = profile.skills || [];
  const linksList = profile.profileLinks || [];
  const cgpaNum = profile.cgpa === '' || profile.cgpa == null ? NaN : Number(profile.cgpa);
  const hasSalary =
    (profile.expectedSalaryMin != null && Number(profile.expectedSalaryMin) > 0) ||
    (profile.expectedSalaryMax != null && Number(profile.expectedSalaryMax) > 0);

  if (profileLoading) {
    return (
      <div className="animate-fadeIn">
        <p className="text-secondary">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="profile-header">
        <div className="profile-avatar" style={{ overflow: 'hidden', padding: 0, background: 'var(--bg-tertiary)' }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            getInitials(session?.user?.name)
          )}
        </div>
        <div className="profile-info" style={{ position: 'relative', zIndex: 1 }}>
          <h2>{session?.user?.name}</h2>
          <p>
            {[profile.branch, profile.batchYear !== '' && profile.batchYear != null ? `Batch ${profile.batchYear}` : '']
              .filter(Boolean)
              .join(' | ') || '—'}
          </p>
          <div className="profile-meta">
            <div className="profile-meta-item">🎓 {profile.rollNumber || '—'}</div>
            <div className="profile-meta-item">
              📊 CGPA: {Number.isFinite(cgpaNum) ? `${cgpaNum}` : '—'}
            </div>
            {displayEmails
              .filter((x) => x.value)
              .map((x, i) => (
                <div key={i} className="profile-meta-item">
                  📧 {x.label}: {x.value}
                </div>
              ))}
            {displayPhones
              .filter((x) => x.value)
              .slice(0, 2)
              .map((x, i) => (
                <div key={i} className="profile-meta-item">
                  📱 {x.label}: {x.value}
                </div>
              ))}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          {editing && (
            <>
              <label
                className={`btn btn-secondary btn-sm${avatarUploading ? ' disabled' : ''}`}
                style={{ cursor: avatarUploading ? 'wait' : 'pointer', margin: 0, opacity: avatarUploading ? 0.7 : 1 }}
              >
                {avatarUploading ? '⏳ Uploading…' : '📷 Photo'}
                <input type="file" accept="image/*" hidden disabled={avatarUploading} onChange={onAvatarChange} />
              </label>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                📄 CV / Resume
                <input type="file" accept=".pdf,.doc,.docx" hidden onChange={onCvChange} />
              </label>
            </>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (editing) {
                void loadProfileFromApi({ silent: true });
                setEditing(false);
              } else setEditing(true);
            }}
          >
            {editing ? '✕ Cancel' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {profile.cvFileName && (
        <p className="text-sm text-secondary" style={{ margin: '-0.5rem 0 1rem' }}>
          Résumé on file: <strong>{profile.cvFileName}</strong> (stored locally on this device)
        </p>
      )}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎓 Academic Information</h3>
          </div>
          <div className="drive-info-grid">
            <div className="drive-info-item">
              <div className="drive-info-label">Department</div>
              {editing ? (
                <input className="form-input" value={profile.department} onChange={(e) => persist({ ...profile, department: e.target.value })} />
              ) : (
                <div className="drive-info-value">{profile.department}</div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Branch / Specialisation</div>
              {editing ? (
                <input className="form-input" value={profile.branch} onChange={(e) => persist({ ...profile, branch: e.target.value })} />
              ) : (
                <div className="drive-info-value">{profile.branch}</div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Roll number</div>
              <div className="drive-info-value" title="Assigned by your college">
                {profile.rollNumber || '—'}
                <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: '0.25rem' }}>
                  Set by placement office — not editable
                </span>
              </div>
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">CGPA</div>
              {editing ? (
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={profile.cgpa === '' ? '' : profile.cgpa}
                  onChange={(e) =>
                    persist({
                      ...profile,
                      cgpa: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
              ) : (
                <div
                  className="drive-info-value"
                  style={{
                    color: Number.isFinite(cgpaNum) && cgpaNum >= 8 ? 'var(--success-600)' : 'var(--text-primary)',
                  }}
                >
                  {Number.isFinite(cgpaNum) ? `${cgpaNum} / 10` : '—'}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">10th %</div>
              {editing ? (
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={profile.tenthPercentage === '' ? '' : profile.tenthPercentage}
                  onChange={(e) =>
                    persist({
                      ...profile,
                      tenthPercentage: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
              ) : (
                <div className="drive-info-value">
                  {profile.tenthPercentage === '' || profile.tenthPercentage == null ? '—' : `${profile.tenthPercentage}%`}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">12th %</div>
              {editing ? (
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={profile.twelfthPercentage === '' ? '' : profile.twelfthPercentage}
                  onChange={(e) =>
                    persist({
                      ...profile,
                      twelfthPercentage: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
              ) : (
                <div className="drive-info-value">
                  {profile.twelfthPercentage === '' || profile.twelfthPercentage == null ? '—' : `${profile.twelfthPercentage}%`}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Graduation year</div>
              {editing ? (
                <input
                  className="form-input"
                  type="number"
                  value={profile.graduationYear === '' ? '' : profile.graduationYear}
                  onChange={(e) =>
                    persist({
                      ...profile,
                      graduationYear: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                    })
                  }
                />
              ) : (
                <div className="drive-info-value">
                  {profile.graduationYear === '' || profile.graduationYear == null ? '—' : profile.graduationYear}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Gender</div>
              {editing ? (
                <select className="form-select" value={profile.gender || ''} onChange={(e) => persist({ ...profile, gender: e.target.value })}>
                  <option value="">—</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              ) : (
                <div className="drive-info-value">{profile.gender || '—'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📇 Contact</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Email addresses
              </div>
              {displayEmails.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input
                        className="form-input"
                        style={{ maxWidth: '120px' }}
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => updateEmailRow(i, { label: e.target.value })}
                      />
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        type="email"
                        placeholder="email@example.com"
                        value={row.value}
                        onChange={(e) => updateEmailRow(i, { value: e.target.value })}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEmailRow(i)} aria-label="Remove email">
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-sm">
                      <strong>{row.label}:</strong> {row.value || '—'}
                    </div>
                  )}
                </div>
              ))}
              {editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addEmailRow}>
                  + Add email
                </button>
              )}
            </div>
            <div>
              <div className="drive-info-label" style={{ marginBottom: '0.5rem' }}>
                Mobile numbers
              </div>
              {displayPhones.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input
                        className="form-input"
                        style={{ maxWidth: '120px' }}
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => updatePhone(i, { label: e.target.value })}
                      />
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="+91 …"
                        value={row.value}
                        onChange={(e) => updatePhone(i, { value: e.target.value })}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhone(i)} aria-label="Remove phone">
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-sm">
                      <strong>{row.label}:</strong> {row.value || '—'}
                    </div>
                  )}
                </div>
              ))}
              {editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPhone}>
                  + Add number
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💡 Skills</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {skillsList.map((skill, i) => (
              <span
                key={i}
                className="badge badge-indigo"
                style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {skill}
                {editing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.7, fontSize: '0.75rem' }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <form onSubmit={handleAddSkill} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                placeholder="Type skill & press Enter..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                style={{ flex: 1, padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Add
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎯 Placement preferences</h3>
          </div>
          <div className="drive-info-grid">
            <div className="drive-info-item" style={{ gridColumn: '1 / -1' }}>
              <div className="drive-info-label">Expected salary (₹ / year)</div>
              {editing ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Min"
                    value={profile.expectedSalaryMin === '' || profile.expectedSalaryMin == null ? '' : profile.expectedSalaryMin}
                    onChange={(e) =>
                      persist({
                        ...profile,
                        expectedSalaryMin: e.target.value === '' ? '' : parseFloat(e.target.value),
                      })
                    }
                  />
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Max"
                    value={profile.expectedSalaryMax === '' || profile.expectedSalaryMax == null ? '' : profile.expectedSalaryMax}
                    onChange={(e) =>
                      persist({
                        ...profile,
                        expectedSalaryMax: e.target.value === '' ? '' : parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              ) : (
                <div className="drive-info-value">
                  {hasSalary ? (
                    <>
                      ₹{(Number(profile.expectedSalaryMin) / 100000).toFixed(1)}L – ₹
                      {(Number(profile.expectedSalaryMax) / 100000).toFixed(1)}L PA
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              )}
            </div>
            <div className="drive-info-item" style={{ gridColumn: '1 / -1' }}>
              <div className="drive-info-label">Preferred locations (comma-separated)</div>
              {editing ? (
                <input
                  className="form-input"
                  value={profile.preferredLocations}
                  onChange={(e) => persist({ ...profile, preferredLocations: e.target.value })}
                  placeholder="Bangalore, Hyderabad, Remote…"
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {locList.map((loc, i) => (
                    <span key={i} className="badge badge-blue">
                      {loc}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="drive-info-item">
              <div className="drive-info-label">Willing to relocate</div>
              {editing ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.willingToRelocate}
                    onChange={(e) => persist({ ...profile, willingToRelocate: e.target.checked })}
                  />
                  Yes
                </label>
              ) : (
                <div className="drive-info-value">{profile.willingToRelocate ? '✅ Yes' : '❌ No'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">🔗 Profiles, projects & websites</h3>
            {editing && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={addProfileLink}>
                + Add link
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {linksList.length === 0 && (
              <p className="text-sm text-secondary">No links yet. Add LinkedIn, GitHub, a general site, or a project link.</p>
            )}
            {linksList.map((link) => (
              <div key={link.id} className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                {editing ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label
                          className="form-label text-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-tertiary)' }}
                        >
                          <ProfileLinkKindIcon kind={link.kind} />
                          Type
                        </label>
                        <select className="form-select" value={link.kind} onChange={(e) => updateLink(link.id, { kind: e.target.value })}>
                          {LINK_KINDS.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-xs">Title / label</label>
                        <input className="form-input" value={link.title} onChange={(e) => updateLink(link.id, { title: e.target.value })} placeholder="e.g. My GitHub" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label text-xs">URL</label>
                        <input className="form-input" value={link.url} onChange={(e) => updateLink(link.id, { url: e.target.value })} placeholder="https://…" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label text-xs">Description</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={link.description}
                          onChange={(e) => updateLink(link.id, { description: e.target.value })}
                          placeholder="What’s on this profile or in this repo? Key projects, stack, etc."
                        />
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLink(link.id)}>
                      Remove link
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', minWidth: 0 }}>
                        <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '2px' }}>
                          <ProfileLinkKindIcon kind={link.kind} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                        <div className="text-xs font-bold text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {LINK_KINDS.find((k) => k.value === link.kind)?.label || link.kind}
                        </div>
                        <a href={link.url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {link.title || link.url || 'Untitled'}
                        </a>
                        {link.description && <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>{link.description}</p>}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">📝 About me</h3>
        </div>
        {editing ? (
          <div>
            <textarea className="form-textarea" value={profile.bio} onChange={(e) => persist({ ...profile, bio: e.target.value })} rows={4} />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={profileSaving}
                onClick={() => {
                  void loadProfileFromApi({ silent: true });
                  setEditing(false);
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={profileSaving} onClick={() => void handleSave()}>
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ lineHeight: 1.7 }}>
            {profile.bio || '—'}
          </p>
        )}
      </div>
    </div>
  );
}
