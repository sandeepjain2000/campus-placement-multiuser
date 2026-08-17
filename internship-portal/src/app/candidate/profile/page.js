'use client';

import { useEffect, useState } from 'react';
import { Link2, Plus, Trash2, Download, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import IpUploadButton from '@/components/ip/IpUploadButton';
import { imageAcceptAttr } from '@/lib/ipFileUpload';
import '@/components/ip/ip-candidate-profile-gemini.css';

const PROFILE_TABS = [
  { id: 'basics', label: '1. Basics & Contact' },
  { id: 'academic', label: '2. Academic & Skills' },
  { id: 'readiness', label: '3. Work Readiness' },
  { id: 'privacy', label: '4. Privacy & Photo' },
  { id: 'history', label: '5. Endorsements & Completed' },
];

const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

const COMMITMENT_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'none', label: 'No — no other commitments' },
  { value: 'other_internship', label: 'Yes — another internship' },
  { value: 'offline_classes', label: 'Yes — offline / college classes' },
  { value: 'part_time_work', label: 'Yes — part-time job or other work' },
  { value: 'other', label: 'Yes — other (use note)' },
];

function emptyAcademicRow() {
  return { row_label: '', college: '', degree: '', specialization: '', study_status: '', graduation_year: '', cgpa: '' };
}

function Field({ label, hint, labelExtra, children, span2 }) {
  return (
    <div className={`ip-cp-field${span2 ? ' ip-cp-span-2' : ''}`}>
      {labelExtra ? (
        <div className="ip-cp-label-row">
          <label className="ip-cp-label">{label}</label>
          {labelExtra}
        </div>
      ) : (
        <label className="ip-cp-label">{label}</label>
      )}
      {hint ? <p className="ip-cp-hint">{hint}</p> : null}
      {children}
    </div>
  );
}

function TextInput({ icon, className = '', ...props }) {
  if (icon) {
    return (
      <div className="ip-cp-input-wrap">
        <span className="ip-cp-input-wrap__icon">{icon}</span>
        <input className={`ip-cp-input ${className}`.trim()} {...props} />
      </div>
    );
  }
  return <input className={`ip-cp-input ${className}`.trim()} {...props} />;
}

function SelectInput({ children, ...props }) {
  return (
    <div className="ip-cp-select-wrap">
      <select className="ip-cp-select" {...props}>
        {children}
      </select>
      <span className="ip-cp-select-wrap__chevron" aria-hidden>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

function OptionalYesNo({ value, onChange, id }) {
  const current = value === true ? 'yes' : value === false ? 'no' : '';
  return (
    <SelectInput
      id={id}
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : v === 'yes');
      }}
    >
      <option value="">Prefer not to say</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </SelectInput>
  );
}

export default function CandidateProfilePage() {
  const [form, setForm] = useState(null);
  const [academics, setAcademics] = useState([emptyAcademicRow()]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [endorsements, setEndorsements] = useState([]);
  const [profileTab, setProfileTab] = useState('basics');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState('idle');

  useEffect(() => {
    fetch('/api/ip/candidate/profile')
      .then((r) => r.json())
      .then((d) => setForm(d.profile));
    fetch('/api/ip/candidate/academics')
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items || []).map((a) => ({
          id: a.id,
          row_label: a.row_label || '',
          college: a.college || '',
          degree: a.degree || '',
          specialization: a.specialization || '',
          study_status: a.study_status || '',
          graduation_year: a.graduation_year || '',
          cgpa: a.cgpa || '',
        }));
        setAcademics(items.length ? items : [emptyAcademicRow()]);
      })
      .catch(() => {});
    fetch('/api/ip/endorsements')
      .then((r) => r.json())
      .then((d) => setEndorsements(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form?.college || academics[0]?.college) return;
    const key = 'ip_profile_college_prefilled_once';
    try {
      if (localStorage.getItem(key)) return;
      setAcademics((rows) => [{ ...(rows[0] || emptyAcademicRow()), college: form.college }, ...rows.slice(1)]);
      localStorage.setItem(key, '1');
    } catch {
      // Saving remains available if storage is blocked.
    }
  }, [form?.college, academics]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setAcademicField(idx, field, value) {
    setAcademics((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addAcademicRow() {
    setAcademics((rows) => [...rows, emptyAcademicRow()]);
  }

  function removeAcademicRow(idx) {
    setAcademics((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      let data = {};
      if (profileTab === 'academic') {
        const res = await fetch('/api/ip/candidate/academics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: academics }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save academics');
      } else {
        const res = await fetch('/api/ip/candidate/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            skills: typeof form.skills === 'string' ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : form.skills,
            preferred_locations: typeof form.preferred_locations === 'string'
              ? form.preferred_locations.split(',').map((s) => s.trim()).filter(Boolean)
              : form.preferred_locations,
          }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      setMessage(
        data.profileComplete
          ? 'Profile saved — profile is complete!'
          : `${PROFILE_TABS.find((tab) => tab.id === profileTab)?.label || 'Profile'} saved.`
      );
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestEmailCode() {
    setMessage('');
    const res = await fetch('/api/ip/candidate/profile/email-change/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Could not send code');
    setEmailStep('verify');
    setMessage(data.message);
  }

  async function verifyEmailCode() {
    const res = await fetch('/api/ip/candidate/profile/email-change/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: emailCode }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Could not verify code');
    setForm((current) => ({ ...current, account_email: data.newEmail }));
    setEmailStep('idle');
    setNewEmail('');
    setEmailCode('');
    setMessage('Login email changed. Sign in with the new email next time.');
  }

  if (!form) {
    return (
      <div className="ip-cand-profile">
        <p className="ip-cp-empty">Loading…</p>
      </div>
    );
  }

  const workMode = form.preferred_work_mode || '';
  const knownMode = WORK_MODES.includes(workMode);
  const completionChecks = [
    { label: 'Name', done: Boolean(form.first_name && form.last_name) },
    { label: 'Mobile', done: Boolean(form.phone) },
    { label: 'City', done: Boolean(form.city) },
    { label: 'College & degree', done: Boolean(academics[0]?.college && academics[0]?.degree) },
    { label: 'Resume', done: Boolean(form.resume_url) },
    { label: 'Skills', done: Boolean(Array.isArray(form.skills) ? form.skills.length : form.skills) },
    { label: 'Portfolio link', done: Boolean(form.linkedin_url || form.github_url || form.personal_website) },
  ];
  const completion = Math.round((completionChecks.filter((item) => item.done).length / completionChecks.length) * 100);

  return (
    <div className="ip-cand-profile">
      <div className="ip-cp-header">
        <div><h1>Candidate profile</h1>
        <p>Complete required basics to unlock applying. Work-readiness questions are optional.</p>
        </div>
        <div className="ip-cp-readiness-badge"><ShieldCheck /> <span><small>Readiness score</small>{completion}% complete</span></div>
      </div>

      {message ? <div className="ip-cp-alert" role="status">{message}</div> : null}

      <div className="ip-cp-unlock">
        <div className="ip-cp-unlock__head"><strong>Application unlock checklist</strong><span>{completion === 100 ? 'Ready to apply' : `${completion}% complete`}</span></div>
        <div className="ip-cp-progress"><span style={{ width: `${completion}%` }} /></div>
        <div className="ip-cp-unlock__items">
          {completionChecks.map((item) => <span key={item.label} className={item.done ? 'is-done' : ''}>{item.done ? <CheckCircle2 /> : <Circle />}{item.label}</span>)}
        </div>
      </div>

      <form className="ip-cp-card" onSubmit={save}>
        <div className="ip-cp-tabs" role="tablist" aria-label="Profile sections">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={profileTab === tab.id}
              onClick={() => setProfileTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {profileTab === 'basics' ? (
          <div className="ip-cp-stack" role="tabpanel">
            <section className="ip-cp-section">
            <h3>Personal details</h3>
            <div className="ip-cp-grid ip-cp-grid--names">
              <Field label="First name">
                <TextInput
                  value={form.first_name || ''}
                  onChange={(e) => set('first_name', e.target.value)}
                  placeholder="Aarav"
                />
              </Field>
              <Field label="Middle name" labelExtra={<span className="ip-cp-label__hint">(optional)</span>}>
                <TextInput value={form.middle_name || ''} onChange={(e) => set('middle_name', e.target.value)} placeholder="Kumar" />
              </Field>
              <Field label="Last name">
                <TextInput value={form.last_name || ''} onChange={(e) => set('last_name', e.target.value)} placeholder="Sharma" />
              </Field>
              <Field
                label="Email"
                labelExtra={<span className="ip-cp-label__hint">(verified login)</span>}
              >
                <TextInput value={form.account_email || ''} disabled readOnly />
              </Field>
              <Field label="Mobile" span2>
                <div className="ip-cp-phone">
                  <SelectInput value={form.phone_country_code || '+91'} onChange={(e) => set('phone_country_code', e.target.value)}>
                    <option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option>
                    <option value="+65">🇸🇬 +65</option><option value="+971">🇦🇪 +971</option><option value="+61">🇦🇺 +61</option>
                  </SelectInput>
                <TextInput
                  value={form.phone || ''}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="98765 43210"
                  type="tel"
                />
                </div>
              </Field>
              <Field label="City">
                <TextInput
                  value={form.city || ''}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="e.g. Bengaluru"
                />
              </Field>
              <Field label="State">
                <TextInput
                  value={form.state || ''}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </Field>
            </div>
            <div className="ip-cp-email-change">
              {emailStep === 'idle' ? (
                <><TextInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" />
                <button type="button" className="ip-cp-btn ip-cp-btn--outline" onClick={requestEmailCode} disabled={!newEmail}>Send OTP</button></>
              ) : (
                <><TextInput inputMode="numeric" maxLength={6} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="6-digit OTP sent to new email" />
                <button type="button" className="ip-cp-btn ip-cp-btn--outline" onClick={verifyEmailCode}>Verify & change email</button></>
              )}
            </div>
            </section>

            <section className="ip-cp-section">
            <h3>Preferences & availability</h3>
            <div className="ip-cp-grid">
            <Field label="Preferred work mode">
              <SelectInput
                value={workMode}
                onChange={(e) => set('preferred_work_mode', e.target.value)}
              >
                <option value="" disabled>
                  Select preferred work mode
                </option>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {!knownMode && workMode ? (
                  <option value={workMode}>{workMode}</option>
                ) : null}
              </SelectInput>
            </Field>

            <Field label="Availability / start date">
              <TextInput
                type="date"
                value={form.availability_date ? String(form.availability_date).slice(0, 10) : ''}
                onChange={(e) => set('availability_date', e.target.value)}
              />
            </Field>

            <Field label="Preferred locations" labelExtra={<span className="ip-cp-label__hint">(comma separated)</span>} span2>
              <TextInput
                value={
                  Array.isArray(form.preferred_locations)
                    ? form.preferred_locations.join(', ')
                    : form.preferred_locations || ''
                }
                onChange={(e) => set('preferred_locations', e.target.value)}
                placeholder="e.g. Bengaluru, Pune, Hyderabad, Remote"
              />
            </Field>
            </div>
            </section>

            <section className="ip-cp-section">
            <h3>Resume & portfolio</h3>
            <Field label="Resume / CV URL">
              <TextInput
                icon={<Link2 className="size-4" />}
                value={form.resume_url || ''}
                onChange={(e) => set('resume_url', e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </Field>

            <div className="ip-cp-grid">
              <Field label="LinkedIn URL">
                <TextInput
                  icon={<Link2 className="size-4" />}
                  value={form.linkedin_url || ''}
                  onChange={(e) => set('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  type="url"
                />
              </Field>
              <Field label="GitHub URL">
                <TextInput
                  icon={<Link2 className="size-4" />}
                  value={form.github_url || ''}
                  onChange={(e) => set('github_url', e.target.value)}
                  placeholder="https://github.com/..."
                  type="url"
                />
              </Field>
            </div>

            <Field label="Personal website">
              <TextInput
                icon={<Link2 className="size-4" />}
                value={form.personal_website || ''}
                onChange={(e) => set('personal_website', e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </Field>
            </section>
          </div>
        ) : null}

        {profileTab === 'academic' ? (
          <div className="ip-cp-stack" role="tabpanel">
            <div className="ip-cp-academic-toolbar">
              <button type="button" className="ip-cp-btn ip-cp-btn--outline ip-cp-btn--sm" onClick={addAcademicRow}>
                <Plus className="size-4" />
                Add row
              </button>
            </div>
            {academics.map((row, idx) => (
              <div key={row.id || idx} className="ip-cp-academic-row">
                <div className="ip-cp-academic-row__head">
                  <span className={`ip-cp-badge${idx === 0 ? '' : ' ip-cp-badge--outline'}`}>
                    {row.row_label || (idx === 0 ? 'Primary education' : `Education ${idx + 1}`)}
                  </span>
                  {academics.length > 1 ? (
                    <button
                      type="button"
                      className="ip-cp-btn ip-cp-btn--ghost"
                      onClick={() => removeAcademicRow(idx)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div className="ip-cp-grid">
                  <Field label="Education label" labelExtra={<span className="ip-cp-label__hint">(optional rename)</span>} span2>
                    <TextInput value={row.row_label || ''} onChange={(e) => setAcademicField(idx, 'row_label', e.target.value)} placeholder={idx === 0 ? 'Primary education' : `Education ${idx + 1}`} />
                  </Field>
                  <Field label="College / university">
                    <TextInput value={row.college} onChange={(e) => setAcademicField(idx, 'college', e.target.value)} />
                  </Field>
                  <Field label="Degree">
                    <TextInput value={row.degree} onChange={(e) => setAcademicField(idx, 'degree', e.target.value)} />
                  </Field>
                  <Field label="Specialization">
                    <TextInput
                      value={row.specialization}
                      onChange={(e) => setAcademicField(idx, 'specialization', e.target.value)}
                    />
                  </Field>
                  <Field label="Study status">
                    <TextInput
                      value={row.study_status}
                      onChange={(e) => setAcademicField(idx, 'study_status', e.target.value)}
                      placeholder="Studying / Graduated"
                    />
                  </Field>
                  <Field label="Graduation year">
                    <TextInput
                      type="number"
                      value={row.graduation_year}
                      onChange={(e) => setAcademicField(idx, 'graduation_year', e.target.value)}
                    />
                  </Field>
                  <Field label="CGPA / percentage">
                    <TextInput value={row.cgpa} onChange={(e) => setAcademicField(idx, 'cgpa', e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
            <Field label="Skills (comma separated)">
              <TextInput
                value={Array.isArray(form.skills) ? form.skills.join(', ') : form.skills || ''}
                onChange={(e) => set('skills', e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {profileTab === 'readiness' ? (
          <div className="ip-cp-stack" role="tabpanel">
            <p className="ip-cp-hint">
              All questions on this tab are optional — answer only what you are comfortable sharing.
            </p>
            <div className="ip-cp-grid">
              <Field
                label="Wired or Wi-Fi broadband?"
                hint="Not mobile 4G/5G hotspot only."
              >
                <OptionalYesNo value={form.has_wired_broadband} onChange={(v) => set('has_wired_broadband', v)} />
              </Field>
              <Field
                label="Dedicated laptop available?"
                hint="A laptop that is regularly available for your work."
              >
                <OptionalYesNo value={form.has_dedicated_laptop} onChange={(v) => set('has_dedicated_laptop', v)} />
              </Field>
              <Field
                label="Preferred working hours range"
                hint="Availability window (when you can work), not total hours. Examples: 10:00–18:00, 14:00–20:00, 09:00–13:00."
                span2
              >
                <div className="ip-cp-time-row">
                  <TextInput
                    type="time"
                    value={form.preferred_hours_start || ''}
                    onChange={(e) => set('preferred_hours_start', e.target.value)}
                  />
                  <span className="ip-cp-hint" style={{ margin: 0 }}>
                    to
                  </span>
                  <TextInput
                    type="time"
                    value={form.preferred_hours_end || ''}
                    onChange={(e) => set('preferred_hours_end', e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Ongoing commitment?" hint="Another internship, offline classes, or similar." span2>
                <SelectInput
                  value={form.ongoing_commitment_choice || ''}
                  onChange={(e) => set('ongoing_commitment_choice', e.target.value)}
                >
                  {COMMITMENT_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {form.ongoing_commitment_choice === 'other' ? <Field label="Commitment note (optional)" span2>
                <TextInput
                  value={form.ongoing_commitment_note || ''}
                  onChange={(e) => set('ongoing_commitment_note', e.target.value)}
                  placeholder="e.g. evening classes Mon–Wed"
                />
              </Field> : null}
            </div>
          </div>
        ) : null}

        {profileTab === 'privacy' ? (
          <div className="ip-cp-stack" role="tabpanel">
            <Field
              label="Profile picture"
              hint="Upload a photo (stored like Placement Hub). You can still opt out of displaying it."
            >
              <div className="ip-cp-photo-row">
                {form.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.profile_picture_url} alt="" className="ip-cp-photo" />
                ) : null}
                <IpUploadButton
                  endpoint="/api/ip/candidate/profile/photo/upload"
                  accept={imageAcceptAttr()}
                  label="Upload photo"
                  onUploaded={(data) => {
                    if (data.profile_picture_url || data.fileUrl) {
                      set('profile_picture_url', data.profile_picture_url || data.fileUrl);
                      setMessage('Photo uploaded. Display is controlled by the checkbox below.');
                    }
                  }}
                />
              </div>
            </Field>
            <div className="ip-cp-check-list">
              <div className="ip-cp-grid">
                <Field label="WhatsApp number">
                  <TextInput type="tel" value={form.whatsapp_number || ''} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Telegram handle">
                  <TextInput value={form.telegram_handle || ''} onChange={(e) => set('telegram_handle', e.target.value)} placeholder="@aarav" />
                </Field>
              </div>
              <label className="ip-cp-check">
                <input
                  type="checkbox"
                  checked={form.show_profile_picture !== false}
                  onChange={(e) => set('show_profile_picture', e.target.checked)}
                />
                <span>Display my profile picture to employers (uncheck to opt out of display while keeping the uploaded photo)</span>
              </label>
              <label className="ip-cp-check">
                <input
                  type="checkbox"
                  checked={!!form.searchable}
                  onChange={(e) => set('searchable', e.target.checked)}
                />
                <span>Make my profile searchable by employers (phone/email/CV stay hidden until an interaction allows it)</span>
              </label>
              <label className="ip-cp-check">
                <input
                  type="checkbox"
                  checked={!!form.show_completed_internships}
                  onChange={(e) => set('show_completed_internships', e.target.checked)}
                />
                <span>Show my completed internships/ratings to employers</span>
              </label>
              <label className="ip-cp-check">
                <input
                  type="checkbox"
                  checked={!!form.whatsapp_opt_in}
                  onChange={(e) => set('whatsapp_opt_in', e.target.checked)}
                  disabled={!String(form.whatsapp_number || '').trim()}
                />
                <span>Opt in to WhatsApp communication</span>
              </label>
              <label className="ip-cp-check">
                <input
                  type="checkbox"
                  checked={!!form.telegram_opt_in}
                  onChange={(e) => set('telegram_opt_in', e.target.checked)}
                  disabled={!String(form.telegram_handle || '').trim()}
                />
                <span>Opt in to Telegram communication</span>
              </label>
            </div>
          </div>
        ) : null}

        {profileTab === 'history' ? (
          <div className="ip-cp-stack" role="tabpanel">
            <div>
              <h3 className="ip-cp-card__title">Endorsements &amp; completed internships</h3>
              <p className="ip-cp-card__desc">Read-only achievements generated after an internship is completed.</p>
            </div>
            {endorsements.length ? endorsements.map((e) => (
              <div key={e.id} className="ip-cp-endorsement">
                <div className="ip-cp-endorsement__top"><p>{e.company_name} — {e.role_title || 'Internship'}</p></div>
                <p className="ip-cp-endorsement__cert">{e.certificate_text}</p>
                {e.skills_endorsed?.length ? <div className="ip-cp-skills">{e.skills_endorsed.map((s) => <span key={s} className="ip-cp-skill">{s}</span>)}</div> : null}
              </div>
            )) : <div className="ip-cp-empty">No endorsements or completed internships yet.</div>}
          </div>
        ) : null}

        {profileTab !== 'history' ? <div className="ip-cp-save">
          <button type="submit" className="ip-cp-btn ip-cp-btn--primary" disabled={saving}>
            {saving ? 'Saving...' : `Save ${PROFILE_TABS.find((tab) => tab.id === profileTab)?.label || 'profile'}`}
          </button>
        </div> : null}
      </form>

      <div className="ip-cp-card">
        <h3 className="ip-cp-card__title">Export</h3>
        <p className="ip-cp-card__desc">Export your applications and profile to Excel.</p>
        <a className="ip-cp-btn ip-cp-btn--outline ip-cp-btn--sm" href="/api/ip/candidate/export">
          <Download className="size-4" />
          Download Excel (.csv)
        </a>
      </div>
    </div>
  );
}
