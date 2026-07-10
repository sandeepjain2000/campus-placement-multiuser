'use client';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';

function formatTimeDisplay(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const am = h < 12;
  const hr = h % 12 || 12;
  const mm = String(m || 0).padStart(2, '0');
  return `${hr}:${mm} ${am ? 'AM' : 'PM'}`;
}

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load interview slots');
  return json;
};

function formatSlotRange(slot) {
  if (slot.startTime && slot.endTime) {
    return `${formatTimeDisplay(slot.startTime)} – ${formatTimeDisplay(slot.endTime)}`;
  }
  if (slot.time) return slot.time;
  return '—';
}

export default function CollegeInterviewsPage() {
  const { addToast } = useToast();
  const { data, mutate, isLoading } = useSWR('/api/college/interviews', fetcher);
  const [section, setSection] = useState('schedule');
  const slots = Array.isArray(data?.slots) ? data.slots : [];
  const results = Array.isArray(data?.results) ? data.results : [];
  const [form, setForm] = useState({
    company: '',
    round: '',
    date: '',
    startTime: '',
    endTime: '',
    interviewer: '',
    panelNames: '',
    students: '',
    createdBy: 'TPO',
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.round.trim() || !form.date || !form.startTime || !form.endTime || !form.interviewer.trim()) return;
    try {
      const res = await fetch('/api/college/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          students: form.students ? form.students.split(',').map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create slot');
      await mutate();
      setForm((prev) => ({ ...prev, company: '', round: '', date: '', startTime: '', endTime: '', interviewer: '', panelNames: '', students: '' }));
      addToast('Interview slot created successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to create interview slot', 'error');
    }
  };

  const stats = useMemo(
    () => ({
      total: slots.length,
      tpo: slots.filter((s) => s.createdBy === 'TPO').length,
      company: slots.filter((s) => s.createdBy === 'Company').length,
    }),
    [slots],
  );

  const getScheduleCsv = useCallback(
    (_scope) => ({
      headers: ['Company', 'Round', 'Date', 'Start', 'End', 'Interviewer', 'Panel_names', 'Students', 'Created_by'],
      rows: slots.map((s) => [
        s.company,
        s.round,
        s.date,
        s.startTime || '',
        s.endTime || '',
        s.interviewer,
        s.panelNames || '',
        s.students.join('; '),
        s.createdBy,
      ]),
    }),
    [slots],
  );

  const getResultsCsv = useCallback(
    (_scope) => ({
      headers: ['Student', 'Company', 'Round', 'Outcome', 'Date'],
      rows: results.map((r) => [r.student, r.company, r.round, r.outcome, r.date]),
    }),
    [results],
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🗓️ Interviews</h1>
          <p>Scheduling (slots &amp; names) and published outcomes. Evaluator feedback is not shown to the college.</p>
        </div>
        <div className="page-header-actions">
          <Link href="/dashboard/college/hiring-assessment" className="btn btn-secondary">
            Hiring Assessment →
          </Link>
          {section === 'schedule' ? (
            <ExportCsvSplitButton filenameBase="college_interview_schedule" currentCount={slots.length} fullCount={slots.length} getRows={getScheduleCsv} />
          ) : (
            <ExportCsvSplitButton filenameBase="college_interview_results" currentCount={results.length} fullCount={results.length} getRows={getResultsCsv} />
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button type="button" className={`tab ${section === 'schedule' ? 'active' : ''}`} onClick={() => setSection('schedule')}>
          Scheduling
        </button>
        <button type="button" className={`tab ${section === 'results' ? 'active' : ''}`} onClick={() => setSection('results')}>
          Results
        </button>
      </div>

      {section === 'schedule' ? (
        <>
          <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
            <div className="stats-card">
              <div className="stats-card-value">{stats.total}</div>
              <div className="stats-card-label">Total Slots</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{stats.tpo}</div>
              <div className="stats-card-label">Scheduled by TPO</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{stats.company}</div>
              <div className="stats-card-label">Scheduled by Company</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Create Interview Slot</h3>
              </div>
              <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
                <input className="form-input" placeholder="Company" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
                <input className="form-input" placeholder="Round (e.g. Round 2 - HR)" value={form.round} onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} />
                <input className="form-input" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '0.35rem', display: 'block' }}>
                      Start time
                    </label>
                    <input className="form-input" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: '0.35rem', display: 'block' }}>
                      End time
                    </label>
                    <input className="form-input" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
                <input className="form-input" placeholder="Primary interviewer / host name" value={form.interviewer} onChange={(e) => setForm((p) => ({ ...p, interviewer: e.target.value }))} />
                <input
                  className="form-input"
                  placeholder="Panel / other names (comma-separated, optional)"
                  value={form.panelNames}
                  onChange={(e) => setForm((p) => ({ ...p, panelNames: e.target.value }))}
                />
                <input className="form-input" placeholder="Assign students (comma-separated)" value={form.students} onChange={(e) => setForm((p) => ({ ...p, students: e.target.value }))} />
                <select className="form-select" value={form.createdBy} onChange={(e) => setForm((p) => ({ ...p, createdBy: e.target.value }))}>
                  <option value="TPO">Scheduled by College (TPO)</option>
                  <option value="Company">Scheduled by Company</option>
                </select>
                <button className="btn btn-primary" type="submit">
                  Create Slot
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Upcoming Slots</h3>
              </div>
              {isLoading ? <div className="text-sm text-secondary">Loading slots...</div> : null}
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {slots.map((slot) => (
                  <div key={slot.id} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="font-semibold">
                        {slot.company} • {slot.round}
                      </div>
                      <span className={`badge ${slot.createdBy === 'TPO' ? 'badge-indigo' : 'badge-blue'}`}>{slot.createdBy}</span>
                    </div>
                    <div className="text-sm text-secondary">
                      {formatDate(slot.date)} · {formatSlotRange(slot)} · {slot.interviewer}
                    </div>
                    {slot.panelNames ? <div className="text-xs text-tertiary">Panel / names: {slot.panelNames}</div> : null}
                    <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                      Assigned: {slot.students.join(', ') || 'Not assigned yet'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--info-500)' }}>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Colleges see <strong>outcomes only</strong> (shortlist / reject / pending). Written feedback and rubric scores (Communication, Projects, Technical)
              are captured for the company workflow but are <strong>not displayed here</strong>.
            </p>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Company</th>
                  <th>Round</th>
                  <th>Outcome</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.student}</td>
                    <td>{r.company}</td>
                    <td>{r.round}</td>
                    <td>
                      <span
                        className={`badge ${r.outcome === 'Shortlisted' ? 'badge-success' : r.outcome === 'Rejected' ? 'badge-gray' : 'badge-amber'}`}
                      >
                        {r.outcome}
                      </span>
                    </td>
                    <td>{formatDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
