'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ToastProvider';
import { formatDate, formatStatus } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const exports = hist?.exports || [];
  const screens = reg?.screens || [];
  const defaultExportExt = 'csv';
  const preFilteredExports = useMemo(() => {
    const q = sectionFilter.trim().toLowerCase();
    return exports.filter((row) => {
      if (statusFilter && String(row.status || '') !== statusFilter) return false;
      if (!q) return true;
      let s = row.section_summary;
      if (typeof s === 'string') {
        try {
          s = JSON.parse(s);
        } catch {
          return false;
        }
      }
      const text = Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(', ').toLowerCase() : '';
      return text.includes(q);
    });
  }, [exports, statusFilter, sectionFilter]);
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: filteredExports,
    filteredCount,
    totalCount: exportsTableTotal,
    hasActiveFilters: exportsHasActiveFilters,
    clearFilters: clearExportsFilters,
  } = useDataTableQuery(preFilteredExports, {
    getSearchText: (row) => {
      let s = row.section_summary;
      if (typeof s === 'string') {
        try {
          s = JSON.parse(s);
        } catch {
          s = null;
        }
      }
      const sections = Array.isArray(s) ? s.map((x) => x.key).filter(Boolean).join(' ') : '';
      return [row.status, row.format, sections].filter(Boolean).join(' ');
    },
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

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
      const name = m?.[1] || `placementhub-export-${new Date().toISOString().slice(0, 10)}.${defaultExportExt}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Download started. A confirmation email was sent if SMTP is configured.', 'success');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [addToast, mutate, defaultExportExt]);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📦 My data export</h1>
          <p>
            Download a CSV snapshot of the data this platform associates with your login ({session?.user?.role?.replace(/_/g, ' ') || '…'}).
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
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <select className="form-input" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <input
            className="form-input"
            style={{ width: 240 }}
            placeholder="Filter by section..."
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          />
        </div>
        {isLoading && <PageLoading message="Loading export history…" inline />}
        {error && <p className="text-sm" style={{ color: 'var(--danger-600)' }}>{error.message}</p>}
        {!isLoading && !error && exports.length === 0 && (
          <p className="text-sm text-secondary">No exports yet. Run a download to create the first entry.</p>
        )}
        {!isLoading && !error && exports.length > 0 && filteredExports.length === 0 && (
          <p className="text-sm text-secondary">No exports match your filters or search.</p>
        )}
        {exportsTableTotal > 0 && (
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search status or sections…"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={exportsTableTotal}
            hasActiveFilters={exportsHasActiveFilters}
            onClear={clearExportsFilters}
            style={{ marginBottom: '1rem' }}
          />
        )}
        {filteredExports.length > 0 && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>Sections</th>
                </tr>
              </thead>
              <tbody>
                {filteredExports.length === 0 && exportsTableTotal > 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary">No exports match your search.</td>
                  </tr>
                ) : null}
                {filteredExports.map((row) => (
                  <tr key={row.id}>
                    <td>{row.created_at ? formatDate(row.created_at) : '—'}</td>
                    <td>{formatStatus(row.status)}</td>
                    <td>{(row.format || 'csv').toUpperCase()}</td>
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
          Same directory as the <strong>Screens</strong> search in the header. Optional smart matching may be unavailable on this deployment.
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
