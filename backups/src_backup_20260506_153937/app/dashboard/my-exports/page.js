'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';

const historyFetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
};

const registryFetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load screens');
  return data;
};

export default function MyExportsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data: hist, mutate, error, isLoading } = useSWR('/api/user/data-export', historyFetcher);
  const { data: reg } = useSWR('/api/screens/registry', registryFetcher);
  const [busy, setBusy] = useState(false);
  const [showAllScreens, setShowAllScreens] = useState(false);

  const exports = hist?.exports || [];
  const screens = reg?.screens || [];

  const runExport = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/user/data-export', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Export failed');
      }
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const name = m?.[1] || `placementhub-export-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Download started. A confirmation email was sent if SMTP is configured.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [addToast, mutate]);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📦 My data export</h1>
          <p>
            Download a JSON snapshot of the data this platform associates with your login ({session?.user?.role?.replace(/_/g, ' ') || '…'}).
            Each request is recorded for audit. Use the <strong>Screens</strong> button in the top bar to jump to any page.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={runExport}>
            {busy ? 'Preparing…' : 'Download full export'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 className="card-title">Export history</h3>
        {isLoading && <p className="text-sm text-secondary">Loading…</p>}
        {error && <p className="text-sm" style={{ color: 'var(--danger-600)' }}>{error.message}</p>}
        {!isLoading && !error && exports.length === 0 && (
          <p className="text-sm text-secondary">No exports yet. Run a download to create the first entry.</p>
        )}
        {exports.length > 0 && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Sections</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((row) => (
                  <tr key={row.id}>
                    <td>{row.created_at ? formatDate(row.created_at) : '—'}</td>
                    <td>{row.status}</td>
                    <td>{row.byte_size != null ? `${row.byte_size} B` : '—'}</td>
                    <td className="text-sm text-secondary">
                      {(() => {
                        let s = row.section_summary;
                        if (typeof s === 'string') {
                          try {
                            s = JSON.parse(s);
                          } catch {
                            return '—';
                          }
                        }
                        return Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(', ') : '—';
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Screens available to you</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAllScreens((v) => !v)}>
            {showAllScreens ? 'Hide list' : `Show all (${screens.length})`}
          </button>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          Same directory as the <strong>Screens</strong> search in the header. Smart matching needs <code>OPENAI_API_KEY</code> on the server.
        </p>
        {showAllScreens && (
          <div className="table-container" style={{ marginTop: '0.75rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Section</th>
                  <th>Screen tag</th>
                  <th>Path</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((s) => (
                  <tr key={s.href}>
                    <td>
                      <a href={s.href}>{s.label}</a>
                    </td>
                    <td>{s.section}</td>
                    <td>
                      <code>{s.screenId}</code>
                    </td>
                    <td className="text-xs text-secondary">{s.href}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
