'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Copy, Eye, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}
import PageError from '@/components/PageError';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import { useToast } from '@/components/ToastProvider';
import {
  contextLabel,
  formatFullErrorLog,
  formatLogReference,
  parseLogDetails,
  postgresHintFromLog,
  severityBadgeClass,
} from '@/lib/platformErrorLogDisplay';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load error logs');
  return json;
};

function summaryLine(row) {
  return row.user_message || row.error_message || '—';
}

function DetailField({ label, children, mono = false }) {
  return (
    <div>
      <div className="text-xs text-tertiary" style={{ textTransform: 'uppercase', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div
        className={mono ? 'font-mono text-xs' : undefined}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {children ?? '—'}
      </div>
    </div>
  );
}

function ErrorLogDetailPanel({ row }) {
  const details = parseLogDetails(row);
  const pgHint = postgresHintFromLog(row);
  const ref = formatLogReference(row.id);

  return (
    <div style={{ display: 'grid', gap: '1.25rem', fontSize: '0.9rem' }}>
      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Overview
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="System Defined Unique Code">
            <strong>{ref || '—'}</strong>
            {row.error_code ? (
              <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: '0.15rem' }}>
                Catalog code: {row.error_code}
              </span>
            ) : null}
            <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: '0.15rem' }}>
              Full ID: {row.id}
            </span>
          </DetailField>
          <DetailField label="When">{formatDateTime(row.created_at)}</DetailField>
          <DetailField label="Severity">
            <span className={`badge ${severityBadgeClass(row.severity)}`}>{row.severity || 'error'}</span>
          </DetailField>
          <DetailField label="Functionality">
            {contextLabel(row.context)}
            <span className="text-xs text-tertiary" style={{ display: 'block' }}>{row.context}</span>
          </DetailField>
          <DetailField label="HTTP status">
            {row.status_code ?? '—'}
            {row.error_code && !String(row.error_code).startsWith('PH-') ? (
              <span className="text-xs text-tertiary" style={{ display: 'block' }}>
                Postgres / driver code: {row.error_code}
              </span>
            ) : null}
          </DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          User &amp; tenant
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="User">{row.user_name || '—'}</DetailField>
          <DetailField label="Email">{details.actorEmail || row.user_email || '—'}</DetailField>
          <DetailField label="Company">{row.company_name || '—'}</DetailField>
          <DetailField label="Campus">{row.tenant_name || '—'}</DetailField>
          <DetailField label="IP address">{row.ip_address || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Request
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Route" mono>
            {[details.requestMethod, details.route, details.requestQuery].filter(Boolean).join(' ') || '—'}
          </DetailField>
          <DetailField label="Source">{details.source || 'server'}</DetailField>
          {details.userAgent ? (
            <DetailField label="User agent">
              <span className="text-xs">{details.userAgent}</span>
            </DetailField>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Error
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="User-facing message">{row.user_message || '—'}</DetailField>
          <DetailField label="Technical message">{row.error_message || '—'}</DetailField>
          {details.technicalMessage && details.technicalMessage !== row.error_message ? (
            <DetailField label="Caught exception" mono>
              {details.technicalMessage}
            </DetailField>
          ) : null}
          {details.systemErrorCode ? (
            <DetailField label="Catalog code" mono>
              {details.systemErrorCode}
            </DetailField>
          ) : null}
          {pgHint ? (
            <div
              style={{
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              <strong>Likely cause:</strong> {pgHint}
            </div>
          ) : null}
          {details.pgDetail ? (
            <DetailField label="Postgres detail" mono>
              {details.pgDetail}
            </DetailField>
          ) : null}
        </div>
      </section>

      {details.stack ? (
        <section>
          <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
            Stack trace
          </h3>
          <pre
            style={{
              margin: 0,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              overflow: 'auto',
              maxHeight: '28vh',
              fontSize: '0.72rem',
              lineHeight: 1.45,
            }}
          >
            {details.stack}
          </pre>
        </section>
      ) : null}

      {(details.requestBody || details.clientDetails) ? (
        <section>
          <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
            Request / client payload
          </h3>
          <pre
            style={{
              margin: 0,
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              overflow: 'auto',
              maxHeight: '28vh',
              fontSize: '0.72rem',
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(
              {
                requestBody: details.requestBody ?? undefined,
                clientDetails: details.clientDetails ?? undefined,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : null}

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Raw details (JSON)
        </h3>
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            overflow: 'auto',
            maxHeight: '24vh',
            fontSize: '0.72rem',
            lineHeight: 1.45,
          }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      </section>
    </div>
  );
}

export default function AdminErrorLogsPage() {
  const { addToast } = useToast();
  const [contextFilter, setContextFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (contextFilter) p.set('context', contextFilter);
    if (severityFilter) p.set('severity', severityFilter);
    if (searchQ) p.set('q', searchQ);
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [contextFilter, severityFilter, searchQ, fromDate, toDate]);

  const { data, error, isLoading } = useSWR(`/api/admin/error-logs${queryString}`, fetcher, {
    revalidateOnFocus: false,
  });

  const logs = data?.logs || [];
  const [selected, setSelected] = useState(null);

  const contextOptions = useMemo(() => {
    const fromApi = data?.contexts || [];
    const fromRows = [...new Set(logs.map((l) => l.context).filter(Boolean))];
    return [...new Set([...fromApi, ...fromRows])].sort();
  }, [data?.contexts, logs]);

  const runSearch = () => setSearchQ(searchInput.trim());

  const copyFullLog = async () => {
    if (!selected) return;
    const text = formatFullErrorLog(selected);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Full log copied to clipboard', 'success');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        addToast('Full log copied to clipboard', 'success');
      } catch {
        addToast('Could not copy to clipboard', 'error');
      }
    }
  };

  if (error) {
    return <PageError message={error.message} />;
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={22} className="text-primary-600" aria-hidden="true" />
          Platform error logs
        </h1>
        <p className="text-secondary text-sm" style={{ margin: '0.35rem 0 0', maxWidth: '48rem', lineHeight: 1.55 }}>
          Full diagnostics for failed API operations. Employers see a short message and reference code — search by reference,
          email, route, or error text. Open a row for stack traces, request payloads, and Postgres hints.
        </p>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
          <label className="form-label" htmlFor="error-log-search">
            Search
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="error-log-search"
              className="form-input"
              placeholder="Reference, email, route, error message…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={runSearch}>
              <Search size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">From</label>
          <input className="form-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">To</label>
          <input className="form-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Severity</label>
          <select className="form-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">All severities</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info / Debug</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Functionality</label>
          <select className="form-select" value={contextFilter} onChange={(e) => setContextFilter(e.target.value)}>
            <option value="">All functionalities</option>
            {contextOptions.map((c) => (
              <option key={c} value={c}>
                {contextLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data?.migrationRequired ? (
        <div className="card" style={{ borderColor: 'var(--warning-300, #fcd34d)', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {data.error || 'Run migration 083_platform_error_logs.sql to enable error logging.'}
          </p>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: 220, margin: '1rem' }} />
        ) : logs.length === 0 ? (
          <p className="text-secondary" style={{ padding: '1.5rem', margin: 0 }}>
            No error logs match your filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Unique Code</th>
                  <th>Severity</th>
                  <th>Functionality</th>
                  <th>Route</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th style={{ width: 56 }} />
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.created_at)}</td>
                    <td className="font-mono text-xs">
                      <div>{row.reference || formatLogReference(row.id)}</div>
                      {row.error_code ? (
                        <div className="text-xs text-tertiary">{row.error_code}</div>
                      ) : null}
                    </td>
                    <td className="text-sm">
                      <span className={`badge ${severityBadgeClass(row.severity)}`}>
                        {(row.severity || 'error').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-sm" style={{ minWidth: 140 }}>
                      {contextLabel(row.context)}
                    </td>
                    <td className="font-mono text-xs" style={{ maxWidth: 160 }}>
                      {row.route || parseLogDetails(row).route || '—'}
                    </td>
                    <td className="text-sm">
                      <div>{row.user_name || '—'}</div>
                      <div className="text-xs text-tertiary">{row.user_email || '—'}</div>
                    </td>
                    <td>
                      <span className={`badge ${severityBadgeClass(row.severity)}`} style={{ marginBottom: '0.2rem' }}>
                        {row.status_code ?? '—'}
                      </span>
                      {row.error_code && !String(row.error_code).startsWith('PH-') ? (
                        <div className="text-xs text-tertiary font-mono">{row.error_code}</div>
                      ) : null}
                    </td>
                    <td className="text-sm" style={{ maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{summaryLine(row)}</div>
                      {postgresHintFromLog(row) ? (
                        <div className="text-xs text-tertiary" style={{ marginTop: '0.2rem' }}>
                          {postgresHintFromLog(row)}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label="View full log"
                        onClick={() => setSelected(row)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminRecordModal
        title={selected ? `Error log — ${formatLogReference(selected.id) || 'details'}` : 'Error log details'}
        mode={selected ? 'view' : null}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <button type="button" className="btn btn-secondary" onClick={() => void copyFullLog()}>
              <Copy size={15} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
              Copy full log
            </button>
          ) : null
        }
      >
        {selected ? <ErrorLogDetailPanel row={selected} /> : null}
      </AdminRecordModal>
    </div>
  );
}
