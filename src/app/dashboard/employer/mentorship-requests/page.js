'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { HandHeart, Send, X } from 'lucide-react';

export default function EmployerMentorshipRequestsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volunteerItem, setVolunteerItem] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/mentorship-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitVolunteer = async () => {
    if (!volunteerItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employer/mentorship-requests/${volunteerItem.id}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Volunteer offer sent', 'success');
      setVolunteerItem(null);
      setMessage('');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

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
            Informal mentor opportunities at campuses you partner with. Volunteering is not a hiring
            commitment.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No open requests at your partnered campuses right now.
          </p>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
            <Link href="/dashboard/employer/select-campus">Manage campus partnerships</Link>
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{item.title}</strong>
                  {item.student && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.student.department || 'Student'}
                      {item.student.batchYear ? ` · Batch ${item.student.batchYear}` : ''}
                    </p>
                  )}
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{item.summary}</p>
                  {item.topics && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
                      <strong>Topics:</strong> {item.topics}
                    </p>
                  )}
                  {item.preferredFormat && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                      <strong>Format:</strong> {item.preferredFormat}
                    </p>
                  )}
                  {item.timeHint && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                      <strong>Timing:</strong> {item.timeHint}
                    </p>
                  )}
                </div>
                <div>
                  {item.hasVolunteered ? (
                    <span className="badge badge-green">You volunteered</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setVolunteerItem(item);
                        setMessage('');
                      }}
                    >
                      Volunteer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {volunteerItem && (
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
          onClick={() => setVolunteerItem(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: '100%', padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Volunteer as mentor</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVolunteerItem(null)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: 0 }}>{volunteerItem.title}</p>
            <label>
              <span className="form-label">Short message (optional)</span>
              <textarea
                className="form-input"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How you can help, availability, etc."
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              disabled={saving}
              onClick={submitVolunteer}
            >
              <Send size={14} style={{ marginRight: 6 }} />
              Send volunteer offer
            </button>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        <Link href="/dashboard/employer/campus-guest-needs">Campus guest needs</Link>
        {' · '}
        <Link href="/dashboard/employer/overview">Overview</Link>
      </p>
    </div>
  );
}
