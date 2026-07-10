'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, PENDING_ROLE_FILTER_OPTIONS, roleFilterFn } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

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

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(rows, {
    getSearchText: (r) =>
      [r.label, r.firstName, r.lastName, r.email, r.role === 'college_admin' ? 'college' : 'employer']
        .filter(Boolean)
        .join(' '),
    filterFn: roleFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

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

  const handleResendVerification = async (userId) => {
    setProcessing(userId + 'resend');
    try {
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'resend_verification' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to resend');
      addToast(json?.message || 'Verification email resent.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to resend verification', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const getExportRows = () => {
    const headers = ['Party', 'Contact Name', 'Email', 'Email verified', 'Role', 'Requested Date'];
    const rowsList = rows.map(r => [
      r.label,
      `${r.firstName} ${r.lastName}`,
      r.email,
      r.emailVerified ? 'Yes' : 'No',
      r.role === 'college_admin' ? 'College' : 'Employer',
      r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
    ]);
    return { headers, rows: rowsList };
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Onboard colleges & employers</h1>
          <p>Approve pending college and employer sign-ups before they can sign in.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <ExportCsvSplitButton 
            filenameBase="admin_pending_registrations" 
            currentCount={displayRows.length}
            fullCount={rows.length}
            getRows={getExportRows} 
          />
          <Link href="/dashboard/admin/colleges/add" className="btn btn-secondary btn-sm">
            + Add college
          </Link>
          <Link href="/dashboard/admin/colleges" className="btn btn-secondary btn-sm">
            Colleges directory
          </Link>
          <Link href="/dashboard/admin/employers" className="btn btn-secondary btn-sm">
            Employers directory
          </Link>
        </div>
      </div>

      {!loading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search party, contact, or email…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={PENDING_ROLE_FILTER_OPTIONS}
          filterLabel="Role"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Email verified</th>
              <th>Requested</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
                  No registrations match your search or filters.
                </td>
              </tr>
            ) : null}
            {displayRows.map((r) => (
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
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge badge-${r.emailVerified ? 'green' : 'amber'}`} style={{ fontSize: '0.75rem' }}>
                      {r.emailVerified ? 'Yes' : 'Pending'}
                    </span>
                    {!r.emailVerified && (
                      <StandardTableIconAction
                        action="resend"
                        variant="ghost"
                        loading={processing === r.id + 'resend'}
                        disabled={processing === r.id + 'resend'}
                        onClick={() => handleResendVerification(r.id)}
                        tooltip="Resend verification email"
                      />
                    )}
                  </div>
                </td>
                <td className="text-sm text-secondary">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div className="table-actions" style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    <StandardTableIconAction
                      action="approve"
                      variant="success"
                      loading={processing === r.id + 'approve'}
                      disabled={processing === r.id + 'approve'}
                      onClick={() => act(r.id, 'approve')}
                    />
                    <StandardTableIconAction
                      action="reject"
                      variant="danger"
                      disabled={processing === r.id + 'reject'}
                      onClick={() => setRejectFor(r)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && totalCount === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
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
