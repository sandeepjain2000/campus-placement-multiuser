'use client';

import { useEffect, useState } from 'react';

const EMPTY = {
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
  supervisorTeam: '',
  supervisorNotes: '',
};

export default function InternshipSupervisorForm({
  initialSupervisor,
  saving,
  onSubmit,
  onClear,
  readOnly = false,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({
      supervisorName: initialSupervisor?.supervisorName || '',
      supervisorEmail: initialSupervisor?.supervisorEmail || '',
      supervisorPhone: initialSupervisor?.supervisorPhone || '',
      supervisorTeam: initialSupervisor?.supervisorTeam || '',
      supervisorNotes: initialSupervisor?.supervisorNotes || '',
    });
  }, [initialSupervisor]);

  if (readOnly) {
    if (!initialSupervisor?.supervisorName) {
      return <p className="text-sm text-secondary" style={{ margin: 0 }}>No company supervisor assigned yet.</p>;
    }
    return (
      <div className="text-sm" style={{ lineHeight: 1.55 }}>
        <div style={{ fontWeight: 600 }}>{initialSupervisor.supervisorName}</div>
        {initialSupervisor.supervisorTeam ? (
          <div className="text-secondary">{initialSupervisor.supervisorTeam}</div>
        ) : null}
        {initialSupervisor.supervisorEmail ? (
          <div>
            <a href={`mailto:${initialSupervisor.supervisorEmail}`}>{initialSupervisor.supervisorEmail}</a>
          </div>
        ) : null}
        {initialSupervisor.supervisorPhone ? (
          <div className="text-secondary">{initialSupervisor.supervisorPhone}</div>
        ) : null}
        {initialSupervisor.supervisorNotes ? (
          <p className="text-secondary" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>
            {initialSupervisor.supervisorNotes}
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
          <label className="form-label">Supervisor name *</label>
          <input
            className="form-input"
            value={form.supervisorName}
            onChange={(e) => setField('supervisorName', e.target.value)}
            placeholder="Anita Mehta"
            required
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Team / role</label>
          <input
            className="form-input"
            value={form.supervisorTeam}
            onChange={(e) => setField('supervisorTeam', e.target.value)}
            placeholder="Platform engineering — Tech lead"
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={form.supervisorEmail}
            onChange={(e) => setField('supervisorEmail', e.target.value)}
            placeholder="supervisor@company.com"
            disabled={saving}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Phone</label>
          <input
            className="form-input"
            value={form.supervisorPhone}
            onChange={(e) => setField('supervisorPhone', e.target.value)}
            placeholder="+91 …"
            disabled={saving}
          />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Notes for intern</label>
        <textarea
          className="form-input"
          rows={3}
          value={form.supervisorNotes}
          onChange={(e) => setField('supervisorNotes', e.target.value)}
          placeholder="Report to me on Day 1. Weekly sync every Friday."
          disabled={saving}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : initialSupervisor ? 'Update supervisor' : 'Assign supervisor'}
        </button>
        {initialSupervisor && onClear ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={onClear}>
            Remove supervisor
          </button>
        ) : null}
      </div>
    </form>
  );
}
