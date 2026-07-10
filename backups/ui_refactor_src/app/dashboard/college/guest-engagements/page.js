'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

export default function CollegeGuestEngagementsPage() {
  const { addToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: 'guest_lecture',
    title: '',
    summary: '',
    requirements: '',
    timeHint: '',
    publishNow: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setListings(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/college/engagement-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: form.kind,
          title: form.title,
          summary: form.summary,
          requirements: form.requirements,
          timeHint: form.timeHint,
          status: form.publishNow ? 'published' : 'draft',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      addToast('Listing saved', 'success');
      setForm({
        kind: 'guest_lecture',
        title: '',
        summary: '',
        requirements: '',
        timeHint: '',
        publishNow: false,
      });
      await load();
    } catch (e2) {
      addToast(e2.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/college/engagement-listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Guest faculty & lectures</h1>
          <p>Published posts are visible to employer partners across the platform.</p>
        </div>
        <Link href="/dashboard/college/overview" className="btn btn-secondary btn-sm">
          Overview
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>New listing</h2>
        <form onSubmit={create} style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="guest_lecture">{KIND_LABEL.guest_lecture}</option>
              <option value="guest_faculty">{KIND_LABEL.guest_faculty}</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Summary</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Requirements / expertise needed</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Preferred timing</label>
            <input
              className="form-input"
              placeholder="e.g. March 2026, weekday mornings"
              value={form.timeHint}
              onChange={(e) => setForm({ ...form, timeHint: e.target.value })}
            />
          </div>
          <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.publishNow}
              onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
            />
            Publish immediately (visible to companies)
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: 'start' }}>
            {saving ? 'Saving…' : 'Save listing'}
          </button>
        </form>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-secondary">
                  Loading…
                </td>
              </tr>
            ) : (
              listings.map((L) => (
                <tr key={L.id}>
                  <td className="font-semibold">{L.title}</td>
                  <td>{KIND_LABEL[L.kind] || L.kind}</td>
                  <td>
                    <span className={`badge badge-${L.status === 'published' ? 'green' : L.status === 'draft' ? 'amber' : 'gray'}`}>
                      {L.status}
                    </span>
                  </td>
                  <td className="text-sm text-secondary">
                    {L.updated_at ? new Date(L.updated_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {L.status !== 'published' ? (
                      <button type="button" className="btn btn-success btn-sm" onClick={() => setStatus(L.id, 'published')}>
                        Publish
                      </button>
                    ) : null}
                    {L.status === 'published' ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 8 }}
                        onClick={() => setStatus(L.id, 'closed')}
                      >
                        Close
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
            {!loading && listings.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-secondary">
                  No listings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
