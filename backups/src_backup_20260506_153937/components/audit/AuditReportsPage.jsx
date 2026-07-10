'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load data');
  return data;
};

function toYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AuditReportsPage({ scopeLabel = 'Audit Reports' }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const [from, setFrom] = useState(toYmd(thirtyDaysAgo));
  const [to, setTo] = useState(toYmd(today));
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [exporting, setExporting] = useState(false);

  const setPresetDays = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    setFrom(toYmd(start));
    setTo(toYmd(end));
  };

  const logsUrl = useMemo(() => {
    const p = new URLSearchParams({
      from,
      to,
      limit: '300',
    });
    if (action.trim()) p.set('action', action.trim());
    if (entityType.trim()) p.set('entityType', entityType.trim());
    return `/api/audit/logs?${p.toString()}`;
  }, [from, to, action, entityType]);

  const { data: logsData, error: logsError, isLoading: logsLoading, mutate: mutateLogs } = useSWR(logsUrl, fetcher);
  const { data: exportsData, error: exportsError, mutate: mutateExports } = useSWR('/api/audit/reports?limit=20', fetcher);
  const logs = logsData?.logs || [];
  const exportsList = exportsData?.exports || [];

  const runExport = async () => {
    if (!from || !to) {
      addToast('Select from/to dates first.', 'warning');
      return;
    }
    if (!email.trim()) {
      addToast('Email is required to send export link.', 'warning');
      return;
    }
    setExporting(true);
    try {
      const res = await fetch('/api/audit/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Export failed');
      addToast('Audit export started. Download link will be sent by email.', 'success');
      await Promise.all([mutateExports(), mutateLogs()]);
    } catch (e) {
      addToast(e.message || 'Failed to start export', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧾 {scopeLabel}</h1>
          <p>Track database changes done from screens, filter by date, and export CSV via secure email link.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="grid grid-4">
          <div className="form-group">
            <label className="form-label">From date</label>
            <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To date</label>
            <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Action (optional)</label>
            <input className="form-input" placeholder="e.g. UPDATE_ADMIN_SETTINGS" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Entity type (optional)</label>
            <input className="form-input" placeholder="e.g. tenants" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPresetDays(7)}>Last 7 days</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPresetDays(30)}>Last 30 days</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPresetDays(90)}>Last 90 days</button>
        </div>
        <div className="grid grid-2" style={{ marginTop: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Email for export link</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => mutateLogs()}>
              Refresh logs
            </button>
            <button className="btn btn-primary" onClick={runExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV & email link'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Recent export jobs</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => mutateExports()}>
            Refresh exports
          </button>
        </div>
        {exportsError && <p style={{ color: 'var(--danger-600)' }}>{exportsError.message}</p>}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Date range</th>
                <th>Status</th>
                <th>Email</th>
                <th>S3 key</th>
              </tr>
            </thead>
            <tbody>
              {exportsList.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at ? formatDate(r.created_at) : '—'}</td>
                  <td>{r.from_date} → {r.to_date}</td>
                  <td><span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}`}>{r.status}</span></td>
                  <td>{r.emailed_to || '—'}</td>
                  <td className="text-sm text-tertiary" style={{ maxWidth: '24rem', wordBreak: 'break-word' }}>
                    {r.s3_key || (r.error_message ? `Error: ${r.error_message}` : '—')}
                  </td>
                </tr>
              ))}
              {exportsList.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No export jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Audit log entries</h3>
        {logsError && <p style={{ color: 'var(--danger-600)' }}>{logsError.message}</p>}
        {logsLoading ? (
          <div className="skeleton skeleton-card" style={{ height: 180 }} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td><span className="badge badge-gray">{l.action || '—'}</span></td>
                    <td>{l.entity_type || '—'} {l.entity_id ? `(${String(l.entity_id).slice(0, 8)}...)` : ''}</td>
                    <td>{l.user_id ? String(l.user_id).slice(0, 8) : '—'}</td>
                    <td>{l.ip_address || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No logs found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
