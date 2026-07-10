'use client';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMPANY_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { useToast } from '@/components/ToastProvider';
import { CalendarDays, Users, Building2, Plus, ChevronRight } from 'lucide-react';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS, validateFieldOrError } from '@/lib/inputConstraints';
import { normalizeTimeHm, validateInterviewDateTimeOrError } from '@/lib/dateOnly';
import { findDuplicateCollegeInterviewSlot } from '@/lib/interviewSlotDuplicate';
import InterviewSlotActions from '@/components/interviews/InterviewSlotActions';

const EMPTY_COLLEGE_FORM = {
  company: '',
  round: '',
  date: '',
  startTime: '',
  endTime: '',
  interviewer: '',
  panelNames: '',
  students: '',
  createdBy: 'TPO',
};

function slotToForm(slot) {
  return {
    company: slot.company || '',
    round: slot.round || '',
    date: slot.date || '',
    startTime: slot.startTime || '',
    endTime: slot.endTime || '',
    interviewer: slot.interviewer || '',
    panelNames: slot.panelNames || '',
    students: Array.isArray(slot.students) ? slot.students.join(', ') : '',
    createdBy: slot.createdBy || 'TPO',
  };
}

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
  const {
    search: resultsSearch,
    setSearch: setResultsSearch,
    sort: resultsSort,
    setSort: setResultsSort,
    filtered: displayResults,
    filteredCount: resultsFilteredCount,
    totalCount: resultsTotalCount,
    hasActiveFilters: resultsHasActiveFilters,
    clearFilters: clearResultsFilters,
  } = useDataTableQuery(results, {
    getSearchText: (r) => [r.student, r.company, r.round, r.outcome].filter(Boolean).join(' '),
    sortOptions: COMPANY_SORT_OPTIONS,
    defaultSort: 'company_asc',
  });
  const [form, setForm] = useState(EMPTY_COLLEGE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_COLLEGE_FORM);
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setForm(slotToForm(slot));
  };

  const removeSlot = async (slot) => {
    if (!window.confirm(`Delete interview slot for ${slot.company} · ${slot.round}?`)) return;
    try {
      const res = await fetch(`/api/college/interviews/${slot.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete slot');
      if (editingId === slot.id) cancelEdit();
      await mutate();
      addToast('Interview slot deleted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete interview slot', 'error');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.round.trim() || !form.date || !form.startTime || !form.endTime || !form.interviewer.trim()) return;
    const dateErr = validateFieldOrError(FIELD_IDS.COLLEGE_INTERVIEW_DATE, form.date);
    if (dateErr) {
      addToast(dateErr, 'warning');
      return;
    }
    const editingSlot = editingId ? slots.find((s) => s.id === editingId) : null;
    const allowPastDatetime =
      Boolean(editingSlot) &&
      form.date === (editingSlot.date || '') &&
      normalizeTimeHm(form.startTime) === normalizeTimeHm(editingSlot.startTime);
    const dateTimeErr = validateInterviewDateTimeOrError(form.date, form.startTime, {
      allowPast: allowPastDatetime,
    });
    if (dateTimeErr) {
      addToast(dateTimeErr, 'warning');
      return;
    }
    const payload = {
      ...form,
      students: form.students ? form.students.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const duplicate = findDuplicateCollegeInterviewSlot(slots, payload, editingId);
    if (duplicate) {
      addToast('An interview slot with the same company, round, date, time, and interviewer already exists.', 'warning');
      return;
    }

    setSaving(true);
    const isEdit = Boolean(editingId);
    try {
      const url = isEdit ? `/api/college/interviews/${editingId}` : '/api/college/interviews';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || (isEdit ? 'Failed to update slot' : 'Failed to create slot'));
      await mutate();
      cancelEdit();
      addToast(isEdit ? 'Interview slot updated.' : 'Interview slot created successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save interview slot', 'error');
    } finally {
      setSaving(false);
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
      rows: displayResults.map((r) => [r.student, r.company, r.round, r.outcome, r.date]),
    }),
    [displayResults],
  );

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CalendarDays size={28} /> Interviews
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Slot scheduling, panel names, and published outcomes. Evaluator feedback stays with the employer.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/college/hiring-assessment" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Hiring Assessment <ChevronRight size={14} />
          </Link>
          {section === 'schedule' ? (
            <ExportCsvSplitButton filenameBase="college_interview_schedule" currentCount={slots.length} fullCount={slots.length} getRows={getScheduleCsv} />
          ) : (
            <ExportCsvSplitButton filenameBase="college_interview_results" currentCount={results.length} fullCount={results.length} getRows={getResultsCsv} />
          )}
        </div>
      </div>

      {/* Pill Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: 'var(--radius-lg)', width: 'fit-content', border: '1px solid var(--border-default)' }}>
        {[{ id: 'schedule', label: 'Scheduling' }, { id: 'results', label: 'Results' }].map(({ id, label }) => (
          <button key={id} type="button" onClick={() => setSection(id)} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none', background: section === id ? 'var(--primary-600)' : 'transparent', color: section === id ? 'white' : 'var(--text-secondary)', fontWeight: section === id ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.15s' }}>{label}</button>
        ))}
      </div>

      {section === 'schedule' ? (
        <>
          <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Slots', value: stats.total, icon: CalendarDays, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
              { label: 'Scheduled by TPO', value: stats.tpo, icon: Users, color: 'var(--info-600)', bg: 'rgba(2,132,199,0.08)' },
              { label: 'Scheduled by Company', value: stats.company, icon: Building2, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: bg, color }}><Icon size={20} strokeWidth={2} /></div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="card-title">{editingId ? 'Edit Interview Slot' : 'Create Interview Slot'}</h3>
                {editingId ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
              <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
                <input className="form-input" placeholder="Company" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
                <input className="form-input" placeholder="Round (e.g. Round 2 - HR)" value={form.round} onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} />
                <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_INTERVIEW_DATE} value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create Slot'}
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
                  <div
                    key={slot.id}
                    style={{
                      border: `1px solid ${editingId === slot.id ? 'var(--primary-400)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.7rem',
                      background: editingId === slot.id ? 'var(--primary-50)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div className="font-semibold">
                        {slot.company} • {slot.round}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className={`badge ${slot.createdBy === 'TPO' ? 'badge-indigo' : 'badge-blue'}`}>{slot.createdBy}</span>
                        <InterviewSlotActions
                          onEdit={() => startEdit(slot)}
                          onDelete={() => removeSlot(slot)}
                          disabled={saving}
                        />
                      </div>
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
          {resultsTotalCount > 0 ? (
            <DataTableToolbar
              search={resultsSearch}
              onSearchChange={setResultsSearch}
              searchPlaceholder="Search student, company, or outcome…"
              sort={resultsSort}
              onSortChange={setResultsSort}
              sortOptions={COMPANY_SORT_OPTIONS}
              filteredCount={resultsFilteredCount}
              totalCount={resultsTotalCount}
              hasActiveFilters={resultsHasActiveFilters}
              onClear={clearResultsFilters}
            />
          ) : null}
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
                {displayResults.length === 0 && resultsTotalCount > 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary">
                      No results match your search.
                    </td>
                  </tr>
                ) : null}
                {displayResults.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.student}</td>
                    <td>
                      <CompanyNameLink name={r.company} website={r.website} />
                    </td>
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
