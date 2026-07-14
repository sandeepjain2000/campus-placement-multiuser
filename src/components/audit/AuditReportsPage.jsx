'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { formatDate } from '@/lib/utils';
import { auditReportsFetcher } from '@/lib/auditReportsFetcher';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';

const swrQuiet = { shouldRetryOnError: false, revalidateOnFocus: false };

function toYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AuditReportsPage({ scopeLabel = 'Audit Reports' }) {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const isCollegeScope = session?.user?.role === 'college_admin';
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const [from, setFrom] = useState(toYmd(thirtyDaysAgo));
  const [to, setTo] = useState(toYmd(today));
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [exporting, setExporting] = useState(false);
  const demoPurgeFilterActive = action.trim().toUpperCase() === 'DEMO_PURGE';

  const { data: collegesData } = useSWR(
    isSuperAdmin ? '/api/admin/colleges?limit=100' : null,
    auditReportsFetcher,
    swrQuiet,
  );
  const colleges = collegesData?.colleges || [];

  const setPresetDays = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    setFrom(toYmd(start));
    setTo(toYmd(end));
  };

  const tenantQuery = tenantFilter.trim() ? `&tenantId=${encodeURIComponent(tenantFilter.trim())}` : '';

  const logsUrl = useMemo(() => {
    const p = new URLSearchParams({
      from,
      to,
      limit: '300',
    });
    if (action.trim()) p.set('action', action.trim());
    if (entityType.trim()) p.set('entityType', entityType.trim());
    if (tenantFilter.trim()) p.set('tenantId', tenantFilter.trim());
    return `/api/audit/logs?${p.toString()}`;
  }, [from, to, action, entityType, tenantFilter]);

  const exportsUrl = useMemo(
    () => `/api/audit/reports?limit=20${tenantQuery}`,
    [tenantQuery],
  );

  const { data: logsData, isLoading: logsLoading, mutate: mutateLogs } = useSWR(logsUrl, auditReportsFetcher, swrQuiet);
  const { data: exportsData, mutate: mutateExports } = useSWR(exportsUrl, auditReportsFetcher, swrQuiet);
  const logs = logsData?.logs || [];
  const exportsList = exportsData?.exports || [];
  const {
    search: logSearch,
    setSearch: setLogSearch,
    sort: logSort,
    setSort: setLogSort,
    filtered: displayLogs,
    filteredCount: logsFilteredCount,
    totalCount: logsTotalCount,
    hasActiveFilters: logsHasActiveFilters,
    clearFilters: clearLogFilters,
  } = useDataTableQuery(logs, {
    getSearchText: (l) =>
      [l.action, l.entity_type, l.entity_id, l.actor_email, l.actor_name, l.details].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

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
      const payload = { from, to, email: email.trim() };
      if (tenantFilter.trim()) payload.tenantId = tenantFilter.trim();
      const res = await fetch('/api/audit/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast('Could not start export. Please try again.', 'error');
        return;
      }
      addToast('Audit export started. Download link will be sent by email.', 'success');
      await Promise.all([mutateExports(), mutateLogs()]);
    } catch {
      addToast('Could not start export. Please try again.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧾 {scopeLabel}</h1>
          <p>
            Platform and college screen actions written to the audit trail — college/employer updates,
            onboarding decisions, settings, demos, and assessment changes. Filter by date and export CSV
            via secure email link.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        {isSuperAdmin && (
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">College scope</label>
            <select
              className="form-input"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            >
              <option value="">All colleges (platform-wide)</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-4">
          <div className="form-group">
            <label className="form-label">From date</label>
            <ValidatedDateInput
              fieldId={FIELD_IDS.DATE_RANGE_FROM}
              context={{ dateTo: to, maxSpanYears: 10 }}
              value={from}
              onChange={setFrom}
              aria-label="From date"
            />
          </div>
          <div className="form-group">
            <label className="form-label">To date</label>
            <ValidatedDateInput
              fieldId={FIELD_IDS.DATE_RANGE_TO}
              context={{ dateFrom: from, maxSpanYears: 10 }}
              value={to}
              onChange={setTo}
              aria-label="To date"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Action (optional)</label>
            <input className="form-input" placeholder="e.g. UPDATE_COLLEGE, APPROVE_REGISTRATION, DEMO_PURGE" value={action} onChange={(e) => setAction(e.target.value)} />
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
          <button className="btn btn-ghost btn-sm" onClick={() => setAction('DEMO_PURGE')}>Demo purges</button>
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
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                {isSuperAdmin && !tenantFilter ? <th>College</th> : null}
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
                  {isSuperAdmin && !tenantFilter ? (
                    <td>{r.tenant_name || (r.tenant_id ? 'College' : 'Platform')}</td>
                  ) : null}
                  <td>{r.from_date} → {r.to_date}</td>
                  <td><span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}`}>{r.status}</span></td>
                  <td>{r.emailed_to || '—'}</td>
                  <td className="text-sm text-tertiary" style={{ maxWidth: '24rem', wordBreak: 'break-word' }}>
                    {r.status === 'failed' ? 'Export failed' : r.s3_key ? 'Stored' : '—'}
                  </td>
                </tr>
              ))}
              {exportsList.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No export jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(logsData?.unavailable || exportsData?.unavailable) && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1rem 1.25rem',
            borderColor: 'var(--warning-200)',
            background: 'var(--warning-50)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--warning-800)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {logsData?.error ||
              exportsData?.error ||
              'Audit data could not be loaded. Ensure audit migrations are applied and S3 is configured for exports.'}
          </p>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Audit log entries</h3>
        {logsLoading ? (
          <div className="skeleton skeleton-card" style={{ height: 180 }} />
        ) : (
          <>
            {logsTotalCount > 0 ? (
              <DataTableToolbar
                search={logSearch}
                onSearchChange={setLogSearch}
                searchPlaceholder="Search action, entity, or user…"
                sort={logSort}
                onSortChange={setLogSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={logsFilteredCount}
                totalCount={logsTotalCount}
                hasActiveFilters={logsHasActiveFilters}
                onClear={clearLogFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  {isSuperAdmin && !tenantFilter ? <th>College</th> : null}
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 && logsTotalCount > 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} className="text-center text-secondary">
                      No log entries match your search.
                    </td>
                  </tr>
                ) : null}
                {displayLogs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    {isSuperAdmin && !tenantFilter ? (
                      <td className="text-sm">{l.tenant_name || '—'}</td>
                    ) : null}
                    <td><span className="badge badge-gray">{l.action || '—'}</span></td>
                    <td>
                      <div>{l.entity_type || '—'}{l.new_values?.label ? ` — ${l.new_values.label}` : ''}</div>
                      {l.details ? <div className="text-xs text-tertiary">{l.details}</div> : null}
                      {l.entity_id ? <div className="text-xs text-tertiary">{String(l.entity_id).slice(0, 8)}…</div> : null}
                    </td>
                    <td>{l.actor_email || l.actor_name || (l.user_id ? `${String(l.user_id).slice(0, 8)}…` : '—')}</td>
                    <td>{l.ip_address || '—'}</td>
                  </tr>
                ))}
                {logsTotalCount === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin && !tenantFilter ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {demoPurgeFilterActive
                        ? 'No demo purges logged for this college yet. Run a purge from Data Entry while logged in, then refresh.'
                        : isCollegeScope
                          ? 'No audit entries for your college in this date range. Try Last 90 days or clear filters.'
                          : 'No logs found for selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
