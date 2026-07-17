'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { Calendar, Info, LayoutGrid, List, Presentation, Send, X } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

const SUMMARY_PREVIEW_CHARS = 48;

function truncate(s, n) {
  if (s == null || s === '') return '—';
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

/** @param {{ summary?: string | null; requirements?: string | null; timeHint?: string | null }} item */
function hasExtraDetails(item) {
  const summary = item.summary ? String(item.summary).trim() : '';
  if (summary.length > SUMMARY_PREVIEW_CHARS) return true;
  if (item.requirements && String(item.requirements).trim()) return true;
  if (item.timeHint && String(item.timeHint).trim()) return true;
  return false;
}

/** @param {{ confirmationSentAt?: string | null; canConfirm?: boolean }} item */
function ConfirmationBadge({ item }) {
  const sent = Boolean(item.confirmationSentAt);
  if (sent) {
    return (
      <span className="badge badge-green">
        Sent {new Date(item.confirmationSentAt).toLocaleDateString()}
      </span>
    );
  }
  if (!item.canConfirm) {
    return (
      <span className="badge badge-gray" title="College has no contact email on file">
        Unavailable
      </span>
    );
  }
  return <span className="text-secondary text-sm">Ready to confirm</span>;
}

export default function EmployerCampusGuestNeedsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  /** @type {'' | 'pending' | 'sent' | 'unavailable'} */
  const [confirmationFilter, setConfirmationFilter] = useState('');
  /** @type {'' | 'guest_faculty' | 'guest_lecture'} */
  const [typeFilter, setTypeFilter] = useState('');
  /** @type {'card' | 'list'} */
  const [viewMode, setViewMode] = useState('card');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/employer/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setRows(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      setError(e.message || 'Failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (viewItem || confirmItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewItem, confirmItem]);

  /** @param {typeof rows[0]} item */
  const confirmationStatus = (item) => {
    if (item.confirmationSentAt) return 'sent';
    if (!item.canConfirm) return 'unavailable';
    return 'pending';
  };

  const tabFilteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (typeFilter && item.kind !== typeFilter) return false;
      if (!confirmationFilter) return true;
      return confirmationStatus(item) === confirmationFilter;
    });
  }, [rows, confirmationFilter, typeFilter]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: filteredRows,
    filteredCount,
    totalCount: tabTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(tabFilteredRows, {
    getSearchText: (item) =>
      [item.college?.name, item.title, item.summary, item.requirements, item.timeHint, KIND_LABEL[item.kind]]
        .filter(Boolean)
        .join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const openConfirm = async (item) => {
    setConfirmItem(item);
    setMailTo('');
    setMailSubject('');
    setMailBody('');
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/employer/engagement-listings/${item.id}/confirmation-draft`);
      const json = await res.json();
      if (res.status === 409) {
        addToast(json.error || 'Already sent', 'info');
        setConfirmItem(null);
        await load();
        return;
      }
      if (!res.ok) throw new Error(json?.error || 'Could not load draft');
      setMailTo(json.toEmail || '');
      setMailSubject(json.subject || '');
      setMailBody(json.body || '');
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
      setConfirmItem(null);
    } finally {
      setDraftLoading(false);
    }
  };

  const sendConfirmation = async () => {
    if (!confirmItem) return;
    setSending(true);
    try {
      const res = await fetch(`/api/employer/engagement-listings/${confirmItem.id}/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: mailSubject, body: mailBody }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Send failed');
      addToast(`Email sent to ${json.toEmail || mailTo}.`, 'success');
      setConfirmItem(null);
      await load();
    } catch (e) {
      addToast(e.message || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const modalBackdrop = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const modalPanel = {
    background: 'var(--bg-elevated)',
    borderRadius: '12px',
    maxWidth: 560,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    border: '1px solid var(--border-default)',
  };

  const confirmPanel = {
    ...modalPanel,
    maxWidth: 640,
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Campus guest needs</h1>
          <p>Browse guest faculty and lecture requests published by colleges. Confirm interest to email the placement office directly.</p>
        </div>
        <Link href="/dashboard/employer/overview" className="btn btn-secondary btn-sm">
          Overview
        </Link>
      </div>

      <div
        className="text-sm"
        role="note"
        style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--primary-200)',
          background: 'color-mix(in srgb, var(--primary-50) 85%, transparent)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>Employers cannot create guest needs here.</strong>{' '}
        Listings are initiated and published by the college placement office under{' '}
        <strong>Guest Faculty &amp; Lectures</strong>. When a campus posts a need, it appears below — use{' '}
        <strong>Confirm</strong> to express interest by email.
      </div>

      {error ? (
        <p className="text-secondary">{error}</p>
      ) : loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <>
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>Confirmation</span>
              <select
                className="form-select"
                style={{ minWidth: 200 }}
                value={confirmationFilter}
                onChange={(e) => setConfirmationFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Ready to confirm</option>
                <option value="sent">Sent</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
            <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-secondary" style={{ whiteSpace: 'nowrap' }}>Type</span>
              <select
                className="form-select"
                style={{ minWidth: 200 }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                <option value="guest_lecture">{KIND_LABEL.guest_lecture}</option>
                <option value="guest_faculty">{KIND_LABEL.guest_faculty}</option>
              </select>
            </label>
            <span className="text-xs text-secondary" style={{ marginLeft: 'auto' }}>
              Showing {filteredCount} of {rows.length}
            </span>
          </div>
        </div>
        {rows.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search college, title, or summary…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={tabTotalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            </div>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                padding: '3px',
                gap: '2px',
                border: '1px solid var(--border-default)',
                flexShrink: 0,
              }}
            >
              {[
                { mode: 'card', icon: LayoutGrid, label: 'Card view' },
                { mode: 'list', icon: List, label: 'List view' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                    color: viewMode === mode ? 'var(--primary-600)' : 'var(--text-tertiary)',
                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Icon size={15} aria-hidden />
                  {mode === 'card' ? 'Cards' : 'List'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {viewMode === 'card' ? (
          <>
            {rows.length === 0 ? (
              <div
                className="card"
                style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}
              >
                <Presentation size={40} className="text-tertiary" style={{ margin: '0 auto 1rem', opacity: 0.45 }} />
                <p className="text-secondary" style={{ margin: 0 }}>
                  No published campus needs right now. Guest needs are created by the college — not by employers.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {filteredRows.map((item) => {
                  const sent = Boolean(item.confirmationSentAt);
                  const canSend = item.canConfirm && !sent;
                  return (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '1.25rem',
                        border: '1px solid var(--border-default)',
                        height: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="font-semibold">{item.college?.name || '—'}</div>
                          <div className="text-xs text-secondary">
                            {[item.college?.city, item.college?.state].filter(Boolean).join(', ') || '—'}
                          </div>
                        </div>
                        <div
                          style={{
                            background: 'var(--primary-50)',
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-md)',
                            flexShrink: 0,
                          }}
                        >
                          <Presentation size={18} className="text-primary-600" />
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          alignItems: 'center',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <span className="badge badge-indigo">{KIND_LABEL[item.kind] || item.kind}</span>
                        <span
                          className="text-xs text-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Calendar size={12} aria-hidden />
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          margin: '0 0 0.5rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.title}
                      </h3>
                      <div
                        className="text-sm text-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 4,
                          marginBottom: '0.75rem',
                          flex: 1,
                        }}
                      >
                        <span style={{ flex: 1, lineHeight: 1.45 }}>
                          {item.summary ? truncate(item.summary, SUMMARY_PREVIEW_CHARS) : '—'}
                        </span>
                        {hasExtraDetails(item) ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                            aria-label="View summary, requirements, and timing"
                            title="View details"
                            onClick={() => setViewItem(item)}
                          >
                            <Info size={14} />
                          </button>
                        ) : null}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid var(--border-default)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <ConfirmationBadge item={item} />
                        <StandardTableIconAction
                          action="confirm"
                          variant="primary"
                          disabled={!canSend}
                          onClick={() => void openConfirm(item)}
                          tooltip={
                            sent
                              ? 'Already confirmed'
                              : !item.canConfirm
                                ? 'College contact email missing'
                                : 'Send confirmation email'
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                {filteredRows.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px dashed var(--border-default)',
                    }}
                  >
                    <p className="text-secondary" style={{ margin: 0 }}>
                      No listings match your search or filters.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        {viewMode === 'list' ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Posted</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th style={{ width: 140, maxWidth: 140 }}>Summary</th>
                  <th>Confirmation</th>
                  <th style={{ width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && tabTotalCount > 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary">
                      No listings match your search.
                    </td>
                  </tr>
                ) : null}
                {filteredRows.map((item) => {
                  const sent = Boolean(item.confirmationSentAt);
                  const canSend = item.canConfirm && !sent;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-semibold">{item.college?.name || '—'}</div>
                        <div className="text-xs text-secondary">
                          {[item.college?.city, item.college?.state].filter(Boolean).join(', ') || ''}
                        </div>
                      </td>
                      <td className="text-sm text-secondary" style={{ whiteSpace: 'nowrap' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span className="badge badge-indigo">{KIND_LABEL[item.kind] || item.kind}</span>
                      </td>
                      <td className="font-medium">{item.title}</td>
                      <td className="text-sm text-secondary" style={{ width: 140, maxWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                          <span
                            title={item.summary || undefined}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {item.summary ? truncate(item.summary, SUMMARY_PREVIEW_CHARS) : '—'}
                          </span>
                          {hasExtraDetails(item) ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                              aria-label="View summary, requirements, and timing"
                              title="View details"
                              onClick={() => setViewItem(item)}
                            >
                              <Info size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <ConfirmationBadge item={item} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <StandardTableIconAction
                          action="confirm"
                          variant="primary"
                          disabled={!canSend}
                          onClick={() => void openConfirm(item)}
                          tooltip={
                            sent
                              ? 'Already confirmed'
                              : !item.canConfirm
                                ? 'College contact email missing'
                                : 'Send confirmation email'
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary">
                      No published campus needs right now.
                    </td>
                  </tr>
                ) : null}
                {rows.length > 0 && filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary">
                      No listings match your filters. Try &quot;All&quot; or a different status.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
        </>
      )}

      {viewItem ? (
        <div style={modalBackdrop} role="presentation" onClick={() => setViewItem(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-view-title"
            style={{ ...modalPanel, padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  {viewItem.college?.name}
                  {viewItem.college?.city ? ` · ${viewItem.college.city}` : ''}
                </p>
                <h2 id="guest-view-title" style={{ fontSize: '1.15rem', margin: '0.35rem 0' }}>
                  {viewItem.title}
                </h2>
                <span className="badge badge-indigo">{KIND_LABEL[viewItem.kind] || viewItem.kind}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Close" onClick={() => setViewItem(null)}>
                <X size={18} />
              </button>
            </div>
            {viewItem.summary ? (
              <p style={{ marginTop: '1rem' }}>{viewItem.summary}</p>
            ) : null}
            {viewItem.requirements ? (
              <div style={{ marginTop: '0.75rem' }}>
                <strong className="text-sm">Requirements</strong>
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                  {viewItem.requirements}
                </p>
              </div>
            ) : null}
            {viewItem.timeHint ? (
              <p className="text-sm text-secondary" style={{ marginTop: '0.75rem' }}>
                <strong>Timing:</strong> {viewItem.timeHint}
              </p>
            ) : null}
            <p className="text-xs text-secondary" style={{ marginTop: '1rem' }}>
              Posted {viewItem.createdAt ? new Date(viewItem.createdAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      ) : null}

      {confirmItem ? (
        <div style={modalBackdrop} role="presentation" onClick={() => !sending && setConfirmItem(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-confirm-title"
            style={{ ...confirmPanel, padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <h2 id="guest-confirm-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Send confirmation email
                </h2>
                <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
                  {confirmItem.college?.name} — {confirmItem.title}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close"
                disabled={sending}
                onClick={() => setConfirmItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            {draftLoading ? (
              <p className="text-secondary" style={{ marginTop: '1rem' }}>
                Loading template…
              </p>
            ) : (
              <>
                <p className="text-sm" style={{ marginTop: '1rem' }}>
                  <strong>To:</strong>{' '}
                  <code style={{ fontSize: '0.85rem' }}>{mailTo}</code>
                </p>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Subject</label>
                  <input
                    className="form-input"
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input"
                    rows={14}
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    disabled={sending}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
                <p className="text-xs text-secondary" style={{ marginBottom: '0.75rem' }}>
                  Subject and body use your employer template (Communication templates) or the platform default. Edit
                  before sending.
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" disabled={sending} onClick={() => void sendConfirmation()}>
                    {sending ? 'Sending…' : 'Send email'}
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={sending} onClick={() => setConfirmItem(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
