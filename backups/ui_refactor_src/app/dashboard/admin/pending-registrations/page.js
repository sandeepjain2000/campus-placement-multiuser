'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

export default function AdminPendingRegistrationsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pending-registrations');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setRows(Array.isArray(json.pending) ? json.pending : []);
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (userId, action, reason) => {
    setProcessing(userId + action);
    try {
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast(action === 'approve' ? 'Account approved.' : 'Registration rejected.', 'success');
      setRejectFor(null);
      setRejectNote('');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Pending registrations</h1>
          <p>Approve new college and employer accounts before they can sign in.</p>
        </div>
        <Link href="/dashboard/admin/colleges" className="btn btn-secondary btn-sm">
          ← Colleges
        </Link>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Requested</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-semibold">{r.label}</td>
                <td>
                  <div>{r.firstName} {r.lastName}</div>
                  <div className="text-sm text-secondary font-mono">{r.email}</div>
                </td>
                <td>
                  <span className={`badge badge-${r.role === 'college_admin' ? 'indigo' : 'green'}`}>
                    {r.role === 'college_admin' ? 'College' : 'Employer'}
                  </span>
                </td>
                <td className="text-sm text-secondary">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={processing === r.id + 'approve'}
                    onClick={() => act(r.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 8 }}
                    disabled={processing === r.id + 'reject'}
                    onClick={() => setRejectFor(r)}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-secondary">
                  No accounts awaiting approval.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {rejectFor && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectFor(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Reject registration</h2>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setRejectFor(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
                {rejectFor.email} — optional note is emailed to the registrant.
              </p>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Reason (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setRejectFor(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={processing === rejectFor.id + 'reject'}
                onClick={() => act(rejectFor.id, 'reject', rejectNote)}
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
