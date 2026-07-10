'use client';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { CalendarDays, Users, Building2, Plus, ChevronRight } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';
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

export default function mb_Interviews() {
  const { addToast } = useToast();
  const { data, mutate, isLoading } = useSWR('/api/college/interviews', fetcher);
  const [section, setSection] = useState('schedule');
  const [showCreate, setShowCreate] = useState(false);
  const slots = Array.isArray(data?.slots) ? data.slots : [];
  const results = Array.isArray(data?.results) ? data.results : [];
  
  const [form, setForm] = useState(EMPTY_COLLEGE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_COLLEGE_FORM);
    setShowCreate(false);
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setForm(slotToForm(slot));
    setShowCreate(true);
  };

  const removeSlot = async (slot) => {
    if (!window.confirm(`Delete interview slot for ${slot.company}?`)) return;
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
      const res = await fetch(isEdit ? `/api/college/interviews/${editingId}` : '/api/college/interviews', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save slot');
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

  return (
    <>
      <MobileHeader 
        title="Interviews" 
        action={
          section === 'schedule' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (showCreate) cancelEdit();
                else setShowCreate(true);
              }}
            >
              <Plus size={16} /> {showCreate ? 'Cancel' : 'New'}
            </button>
          ) : null
        } 
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        {/* Mobile Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          {[{ id: 'schedule', label: 'Schedule' }, { id: 'results', label: 'Results' }].map(({ id, label }) => (
            <button 
              key={id} 
              type="button" 
              onClick={() => { setSection(id); setShowCreate(false); }} 
              style={{ flex: 1, padding: '0.65rem 0', borderRadius: '8px', border: 'none', background: section === id ? 'var(--primary-600)' : 'transparent', color: section === id ? 'white' : 'var(--text-secondary)', fontWeight: section === id ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'schedule' && showCreate && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-300)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{editingId ? 'Edit Interview Slot' : 'Create Interview Slot'}</h3>
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="form-input" placeholder="Company Name" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
              <input className="form-input" placeholder="Round (e.g. Round 2 - HR)" value={form.round} onChange={(e) => setForm((p) => ({ ...p, round: e.target.value }))} />
              <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_INTERVIEW_DATE} value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Start Time</label>
                  <input className="form-input" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">End Time</label>
                  <input className="form-input" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>
              <input className="form-input" placeholder="Primary interviewer name" value={form.interviewer} onChange={(e) => setForm((p) => ({ ...p, interviewer: e.target.value }))} />
              <input className="form-input" placeholder="Panel members (optional)" value={form.panelNames} onChange={(e) => setForm((p) => ({ ...p, panelNames: e.target.value }))} />
              <textarea className="form-input" placeholder="Assign students (comma-separated roll numbers)" value={form.students} onChange={(e) => setForm((p) => ({ ...p, students: e.target.value }))} rows={2} />
              <select className="form-select" value={form.createdBy} onChange={(e) => setForm((p) => ({ ...p, createdBy: e.target.value }))}>
                <option value="TPO">Scheduled by College (TPO)</option>
                <option value="Company">Scheduled by Company</option>
              </select>
              <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create Slot'}
              </button>
            </form>
          </div>
        )}

        {section === 'schedule' && !showCreate && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats.total}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Slots</div>
              </div>
              <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info-600)' }}>{stats.tpo}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>By College</div>
              </div>
              <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning-600)' }}>{stats.company}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>By Company</div>
              </div>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: '12px' }} />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CalendarDays size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No upcoming slots</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {slots.map((slot) => (
                  <div key={slot.id} className="card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: slot.createdBy === 'TPO' ? 'var(--info-500)' : 'var(--warning-500)' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.35rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{slot.company}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className={`badge ${slot.createdBy === 'TPO' ? 'badge-indigo' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>{slot.createdBy}</span>
                        <InterviewSlotActions
                          onEdit={() => startEdit(slot)}
                          onDelete={() => removeSlot(slot)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {slot.round}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarDays size={14} style={{ opacity: 0.7 }} />
                        <span>{formatDate(slot.date)} · {formatSlotRange(slot)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={14} style={{ opacity: 0.7 }} />
                        <span>{slot.interviewer} {slot.panelNames ? `(+ ${slot.panelNames.split(',').length})` : ''}</span>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-default)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Assigned: {slot.students.join(', ') || 'None'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'results' && (
          <>
            <div style={{ background: 'var(--info-50)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--info-200)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--info-800)', lineHeight: 1.4 }}>
              <strong>Note:</strong> Colleges see outcomes only. Written feedback and rubric scores stay with the employer.
            </div>
            
            {isLoading ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: '12px' }} />)}
             </div>
            ) : results.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Users size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No results published yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {results.map((r) => (
                  <div key={r.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.student}</div>
                      <span className={`badge ${r.outcome === 'Shortlisted' ? 'badge-success' : r.outcome === 'Rejected' ? 'badge-gray' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                        {r.outcome}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <CompanyNameLink name={r.company} website={r.website} /> · {r.round}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                      {formatDate(r.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
