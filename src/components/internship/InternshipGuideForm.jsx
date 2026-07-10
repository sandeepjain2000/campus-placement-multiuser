'use client';

import { useEffect, useState } from 'react';

const EMPTY = {
  guideName: '',
  guideEmail: '',
  guidePhone: '',
  guideDepartment: '',
  guideNotes: '',
};

export default function InternshipGuideForm({ initialGuide, saving, onSubmit, onClear, readOnly = false }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({
      guideName: initialGuide?.guideName || '',
      guideEmail: initialGuide?.guideEmail || '',
      guidePhone: initialGuide?.guidePhone || '',
      guideDepartment: initialGuide?.guideDepartment || '',
      guideNotes: initialGuide?.guideNotes || '',
    });
  }, [initialGuide]);

  if (readOnly) {
    if (!initialGuide?.guideName) {
      return <p className="text-sm text-secondary" style={{ margin: 0 }}>No campus guide assigned yet.</p>;
    }
    return (
      <div className="text-sm" style={{ lineHeight: 1.55 }}>
        <div style={{ fontWeight: 600 }}>{initialGuide.guideName}</div>
        {initialGuide.guideDepartment ? (
          <div className="text-secondary">{initialGuide.guideDepartment}</div>
        ) : null}
        {initialGuide.guideEmail ? (
          <div>
            <a href={`mailto:${initialGuide.guideEmail}`}>{initialGuide.guideEmail}</a>
          </div>
        ) : null}
        {initialGuide.guidePhone ? <div className="text-secondary">{initialGuide.guidePhone}</div> : null}
        {initialGuide.guideNotes ? (
          <p className="text-secondary" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>
            {initialGuide.guideNotes}
          </p>
        ) : null}
      </div>
    );
  }

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      style={{ display: 'grid', gap: '0.65rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Guide name *</label>
          <input
            className="form-input"
            value={form.guideName}
            onChange={(e) => setField('guideName', e.target.value)}
            placeholder="Dr. Priya Sharma"
            required
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Department</label>
          <input
            className="form-input"
            value={form.guideDepartment}
            onChange={(e) => setField('guideDepartment', e.target.value)}
            placeholder="CSE — Internship coordinator"
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={form.guideEmail}
            onChange={(e) => setField('guideEmail', e.target.value)}
            placeholder="guide@college.edu"
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Phone</label>
          <input
            className="form-input"
            value={form.guidePhone}
            onChange={(e) => setField('guidePhone', e.target.value)}
            placeholder="+91 …"
            disabled={saving}
          />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Notes for student</label>
        <textarea
          className="form-input"
          rows={3}
          value={form.guideNotes}
          onChange={(e) => setField('guideNotes', e.target.value)}
          placeholder="Check-in fortnightly. Share weekly log with your guide."
          disabled={saving}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : initialGuide ? 'Update guide' : 'Assign guide'}
        </button>
        {initialGuide && onClear ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={onClear}>
            Remove guide
          </button>
        ) : null}
      </div>
    </form>
  );
}
