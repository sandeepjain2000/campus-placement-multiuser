'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { mentorshipStatusLabel } from '@/lib/studentMentorshipRequest';
import { HandHeart, Plus, Send, X } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  summary: '',
  topics: '',
  preferredFormat: '',
  timeHint: '',
};

function statusBadgeClass(status) {
  if (status === 'approved') return 'badge-green';
  if (status === 'submitted') return 'badge-yellow';
  if (status === 'rejected') return 'badge-red';
  if (status === 'closed') return 'badge-gray';
  return 'badge-gray';
}

export default function StudentMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/mentorship-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      summary: item.summary || '',
      topics: item.topics || '',
      preferredFormat: item.preferredFormat || '',
      timeHint: item.timeHint || '',
    });
    setShowForm(true);
  };

  const submitForm = async (submitNow) => {
    setSaving(true);
    try {
      const payload = { ...form, submit: submitNow };
      const url = editing
        ? `/api/student/mentorship-requests/${editing.id}`
        : '/api/student/mentorship-requests';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      addToast(submitNow ? 'Request submitted for college review' : 'Draft saved', 'success');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitExisting = async (id) => {
    try {
      const res = await fetch(`/api/student/mentorship-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Submitted for college review', 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const closeRequest = async (id) => {
    if (!window.confirm('Close this mentorship request?')) return;
    try {
      const res = await fetch(`/api/student/mentorship-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Request closed', 'success');
      setDetail(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [items],
  );

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span
            style={{
              display: 'flex',
              padding: '0.5rem',
              background: 'var(--primary-50)',
              borderRadius: '10px',
              color: 'var(--primary-600)',
            }}
            aria-hidden
          >
            <HandHeart size={24} />
          </span>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
              Request a mentor
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Post what you need help with. Your college reviews the request; partnered employers can
              volunteer informally — this is not a job application.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} style={{ marginRight: 6 }} />
          New request
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              {editing ? 'Edit request' : 'New mentorship request'}
            </h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label>
              <span className="form-label">Title</span>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Guidance on system design interviews"
              />
            </label>
            <label>
              <span className="form-label">What you need help with</span>
              <textarea
                className="form-input"
                rows={4}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Describe your goals and what kind of mentorship would help."
              />
            </label>
            <label>
              <span className="form-label">Topics (optional)</span>
              <input
                className="form-input"
                value={form.topics}
                onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                placeholder="e.g. DSA, resume, cloud architecture"
              />
            </label>
            <label>
              <span className="form-label">Preferred format (optional)</span>
              <input
                className="form-input"
                value={form.preferredFormat}
                onChange={(e) => setForm((f) => ({ ...f, preferredFormat: e.target.value }))}
                placeholder="e.g. 30-min video call, async chat"
              />
            </label>
            <label>
              <span className="form-label">Timing (optional)</span>
              <input
                className="form-input"
                value={form.timeHint}
                onChange={(e) => setForm((f) => ({ ...f, timeHint: e.target.value }))}
                placeholder="e.g. Weekends, before placements"
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => submitForm(false)}
            >
              Save draft
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => submitForm(true)}
            >
              <Send size={14} style={{ marginRight: 6 }} />
              Submit to college
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No requests yet. Create one when you want informal guidance from industry mentors.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {sorted.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{item.title}</strong>
                    <span className={`badge ${statusBadgeClass(item.status)}`}>
                      {mentorshipStatusLabel(item.status)}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {item.summary}
                  </p>
                  {item.collegeNote && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                      <strong>College note:</strong> {item.collegeNote}
                    </p>
                  )}
                  {item.status === 'approved' && item.volunteerCount > 0 && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--primary-700)' }}>
                      {item.volunteerCount} mentor{item.volunteerCount === 1 ? '' : 's'} volunteered
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {(item.status === 'draft' || item.status === 'rejected') && (
                    <>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => submitExisting(item.id)}>
                        Submit
                      </button>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetail(item)}>
                        View volunteers
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => closeRequest(item.id)}>
                        Close
                      </button>
                    </>
                  )}
                  {item.status === 'submitted' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => closeRequest(item.id)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
          onClick={() => setDetail(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 520, width: '100%', padding: '1.25rem', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Mentor volunteers</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{detail.title}</p>
            {(detail.volunteers || []).length === 0 ? (
              <p>No volunteers yet. Check back after employers respond.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {detail.volunteers.map((v) => (
                  <li key={v.id} style={{ marginBottom: '0.75rem' }}>
                    <strong>{v.companyName}</strong>
                    {v.message && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{v.message}</p>
                    )}
                    <span className="text-secondary text-sm">
                      {v.volunteeredAt ? new Date(v.volunteeredAt).toLocaleString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              Coordinate follow-up directly with volunteers or through your placement office.
            </p>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        <Link href="/dashboard/student/overview">Back to overview</Link>
        {' · '}
        Looking for formal mentorship programs? See{' '}
        <Link href="/dashboard/student/applications/mentorship">Mentorship programs</Link>.
      </p>
    </div>
  );
}
