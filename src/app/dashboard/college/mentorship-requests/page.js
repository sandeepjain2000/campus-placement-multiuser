'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { mentorshipStatusLabel } from '@/lib/studentMentorshipRequest';
import { Check, HandHeart, X } from 'lucide-react';

function statusBadgeClass(status) {
  if (status === 'approved') return 'badge-green';
  if (status === 'submitted') return 'badge-yellow';
  if (status === 'rejected') return 'badge-red';
  if (status === 'closed') return 'badge-gray';
  return 'badge-gray';
}

export default function CollegeMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [review, setReview] = useState(null);
  const [collegeNote, setCollegeNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/college/mentorship-requests${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (item) => {
    setReview({
      id: item.id,
      title: item.title,
      summary: item.summary,
      topics: item.topics || '',
      preferredFormat: item.preferredFormat || '',
      timeHint: item.timeHint || '',
      student: item.student,
    });
    setCollegeNote('');
  };

  const patchReview = async (action) => {
    if (!review) return;
    if (action === 'reject' && !collegeNote.trim()) {
      addToast('Add a note for the student when rejecting', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/college/mentorship-requests/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title: review.title,
          summary: review.summary,
          topics: review.topics,
          preferredFormat: review.preferredFormat,
          timeHint: review.timeHint,
          collegeNote: collegeNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast(action === 'approve' ? 'Request approved' : 'Request rejected', 'success');
      setReview(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <span
          style={{
            display: 'flex',
            padding: '0.5rem',
            background: 'var(--primary-50)',
            borderRadius: '10px',
            color: 'var(--primary-600)',
          }}
        >
          <HandHeart size={24} />
        </span>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
            Student mentorship requests
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Review informal mentor requests before they are visible to partnered employers.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 200 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="submitted">Pending review</option>
          <option value="approved">Approved (open)</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No requests in this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filtered.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{item.title}</strong>
                    <span className={`badge ${statusBadgeClass(item.status)}`}>
                      {mentorshipStatusLabel(item.status)}
                    </span>
                  </div>
                  {item.student && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.student.name || 'Student'}
                      {item.student.rollNumber ? ` · ${item.student.rollNumber}` : ''}
                      {item.student.department ? ` · ${item.student.department}` : ''}
                    </p>
                  )}
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{item.summary}</p>
                  {item.status === 'approved' && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
                      {item.volunteerCount || 0} volunteer{(item.volunteerCount || 0) === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                {item.status === 'submitted' && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openReview(item)}>
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {review && (
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
          onClick={() => setReview(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 560, width: '100%', padding: '1.25rem', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Review request</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReview(null)}>
                <X size={16} />
              </button>
            </div>
            {review.student && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {review.student.name} {review.student.rollNumber ? `(${review.student.rollNumber})` : ''}
              </p>
            )}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label>
                <span className="form-label">Title (you may edit before approving)</span>
                <input
                  className="form-input"
                  value={review.title}
                  onChange={(e) => setReview((r) => ({ ...r, title: e.target.value }))}
                />
              </label>
              <label>
                <span className="form-label">Summary</span>
                <textarea
                  className="form-input"
                  rows={4}
                  value={review.summary}
                  onChange={(e) => setReview((r) => ({ ...r, summary: e.target.value }))}
                />
              </label>
              <label>
                <span className="form-label">Topics</span>
                <input
                  className="form-input"
                  value={review.topics}
                  onChange={(e) => setReview((r) => ({ ...r, topics: e.target.value }))}
                />
              </label>
              <label>
                <span className="form-label">Note to student (required if rejecting)</span>
                <textarea
                  className="form-input"
                  rows={2}
                  value={collegeNote}
                  onChange={(e) => setCollegeNote(e.target.value)}
                  placeholder="Optional on approve; required on reject"
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => patchReview('approve')}
              >
                <Check size={14} style={{ marginRight: 6 }} />
                Approve for employers
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => patchReview('reject')}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        <Link href="/dashboard/college/overview">Back to overview</Link>
      </p>
    </div>
  );
}
