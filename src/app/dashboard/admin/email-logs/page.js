'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Mail, Copy, Eye, Search } from 'lucide-react';

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

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load email logs');
  return json;
};

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

function EmailLogDetailPanel({ row }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem', fontSize: '0.9rem' }}>
      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Overview
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Log ID" mono>{row.id}</DetailField>
          <DetailField label="Sent At">{formatDateTime(row.created_at)}</DetailField>
          <DetailField label="Context">{row.context || '—'}</DetailField>
          <DetailField label="Subject">{row.subject_truncated || '—'}</DetailField>
          <DetailField label="Message ID" mono>{row.message_id || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Recipients
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Original Recipient" mono>{row.original_to || '—'}</DetailField>
          <DetailField label="After Communication Routing" mono>{row.after_communication_to || '—'}</DetailField>
          <DetailField label="Final SMTP Recipient" mono>{row.resolved_to || '—'}</DetailField>
          <DetailField label="Recipient Login Email (audit)" mono>{row.recipient_login_email || '—'}</DetailField>
          <DetailField label="Recipient Name">{row.recipient_name || '—'}</DetailField>
          <DetailField label="Recipient Role">{row.recipient_role || '—'}</DetailField>
          <DetailField label="Recipient User ID" mono>{row.recipient_user_id || '—'}</DetailField>
          <DetailField label="Recipient Tenant ID" mono>{row.recipient_tenant_id || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Triggered By
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Acting User ID" mono>{row.user_id || '—'}</DetailField>
          <DetailField label="Acting User">{row.acting_user_name?.trim() || '—'}</DetailField>
          <DetailField label="Acting User Email" mono>{row.acting_user_email || '—'}</DetailField>
        </div>
      </section>

      <section>
        <h3 className="text-sm" style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
          Delivery Status
        </h3>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <DetailField label="Status">
            <span className={`badge badge-${row.status === 'sent' ? 'green' : row.status === 'failed' ? 'red' : 'gray'}`}>
              {(row.status || 'unknown').toUpperCase()}
            </span>
          </DetailField>
          {row.skip_reason && <DetailField label="Skip Reason">{row.skip_reason}</DetailField>}
          {row.smtp_response && <DetailField label="SMTP Response" mono>{row.smtp_response}</DetailField>}
          {row.error_message && <DetailField label="Error Message">{row.error_message}</DetailField>}
          {row.error_code && <DetailField label="Error Code" mono>{row.error_code}</DetailField>}
        </div>
      </section>
    </div>
  );
}

export default function AdminEmailLogsPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (searchQ) p.set('search', searchQ);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [statusFilter, searchQ]);

  const { data, error, isLoading } = useSWR(`/api/admin/email-logs${queryString}`, fetcher, {
    revalidateOnFocus: false,
  });

  const logs = data?.logs || [];
  const [selected, setSelected] = useState(null);

  const runSearch = () => setSearchQ(searchInput.trim());

  const copyLogDetails = async () => {
    if (!selected) return;
    const text = JSON.stringify(selected, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Email log details copied to clipboard', 'success');
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  };

  if (error) {
    return <PageError message={error.message} />;
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={22} className="text-primary-600" aria-hidden="true" />
          Platform email delivery logs
        </h1>
        <p className="text-secondary text-sm" style={{ margin: '0.35rem 0 0', maxWidth: '48rem', lineHeight: 1.55 }}>
          Outbound email history with a three-step recipient trail: original address, after communication-email
          routing, and final SMTP destination. Recipient login email is stored even if the account is later deleted.
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
          <label className="form-label" htmlFor="email-log-search">
            Search
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="email-log-search"
              className="form-input"
              placeholder="Login email, recipient, subject, context..."
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
          <label className="form-label">Delivery Status</label>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: 220, margin: '1rem' }} />
        ) : logs.length === 0 ? (
          <p className="text-secondary" style={{ padding: '1.5rem', margin: 0 }}>
            No email logs match your filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Context</th>
                  <th>Recipient (login)</th>
                  <th>Original → Final</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th style={{ width: 56 }} />
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.created_at)}</td>
                    <td className="text-sm font-semibold">{row.context || '—'}</td>
                    <td className="text-sm font-mono">
                      {row.recipient_login_email || row.original_to || '—'}
                      {row.recipient_name ? (
                        <div className="text-xs text-tertiary" style={{ fontFamily: 'inherit' }}>
                          {row.recipient_name}
                          {row.recipient_role ? ` · ${row.recipient_role}` : ''}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-sm font-mono" style={{ maxWidth: 220 }}>
                      <span title={row.original_to || ''}>{row.original_to || '—'}</span>
                      <div className="text-xs text-tertiary">→ {row.resolved_to || '—'}</div>
                    </td>
                    <td className="text-sm" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.subject_truncated || '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${row.status === 'sent' ? 'green' : row.status === 'failed' ? 'red' : 'gray'}`}>
                        {(row.status || 'unknown').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label="View log details"
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
        title="Email Delivery Log Details"
        mode={selected ? 'view' : null}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <button type="button" className="btn btn-secondary" onClick={() => void copyLogDetails()}>
              <Copy size={15} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
              Copy raw log
            </button>
          ) : null
        }
      >
        {selected ? <EmailLogDetailPanel row={selected} /> : null}
      </AdminRecordModal>
    </div>
  );
}
