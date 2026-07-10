'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, EMPLOYER_STATUS_FILTER_OPTIONS, employerStatusFilterFn } from '@/lib/tableQueryPresets';
import Link from 'next/link';
import { formatStatus, getStatusColor } from '@/lib/utils';
import EmployerCompanyCell from '@/components/employer/EmployerCompanyCell';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  TIE_UP_REVOKE_DISABLED_TITLE,
  TIE_UP_REVOKE_ENABLED,
  TIE_UP_REVOKE_MESSAGES,
} from '@/lib/employerTieUpShared';
import { labelEmployerCompanyType } from '@/lib/employerCompanyTypeLabels';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Building2, Globe, Users, Shield, Star, ExternalLink, X, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (data?.employers && Array.isArray(data.employers)) return data;
  if (Array.isArray(data)) return { employers: data, staffDirectory: [] };
  throw new Error(data.error || 'Invalid response');
};

const STATUS_META = {
  pending:   { label: 'Pending',   badgeClass: 'badge-amber', icon: Clock },
  approved:  { label: 'Approved',  badgeClass: 'badge-green', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  badgeClass: 'badge-red',   icon: XCircle },
  revoked:   { label: 'Revoked',   badgeClass: 'badge-gray',  icon: AlertCircle },
};

function getStatusMeta(status) {
  return STATUS_META[status] || { label: formatStatus(status), badgeClass: 'badge-gray', icon: AlertCircle };
}

function StatusPill({ status }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
      <Icon size={11} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

export default function DesktopEmployers() {
  const { data, error, isLoading, mutate } = useSWR('/api/college/employers', fetcher);
  const [processingId, setProcessingId] = useState(null);
  const [pocModal, setPocModal] = useState(null);
  const [pocStaffSelection, setPocStaffSelection] = useState([]);
  const [pocSaving, setPocSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { addToast } = useToast();

  const list = data?.employers || [];
  const staffDirectory = data?.staffDirectory || [];

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayList,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(list, {
    getSearchText: (e) => [e.name, e.industry, e.status, e.email, labelEmployerCompanyType(e.company_type)].filter(Boolean).join(' '),
    filterFn: employerStatusFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  useEffect(() => {
    if (!pocModal) { setPocStaffSelection([]); return; }
    const ids = pocModal.coordination_poc_user_ids;
    setPocStaffSelection(Array.isArray(ids) ? ids.map((id) => String(id)) : []);
  }, [pocModal]);

  const handleRevoke = async (employerId, reason) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, confirmed: true, reason: reason || null }),
      });
      const data = await res.json();
      if (res.ok) {
        await mutate();
        addToast(data.message || 'Tie-up revoked. The employer has been notified.', 'success');
      } else addToast(data.error || 'Failed to revoke tie-up.', 'error');
    } catch { addToast('Network error while revoking tie-up.', 'error'); }
    finally { setProcessingId(null); }
  };

  const handleReinstate = async (employerId) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/reinstate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId }),
      });
      const data = await res.json();
      if (res.ok) {
        await mutate();
        addToast(data.message || 'Tie-up restored.', 'success');
      } else addToast(data.error || 'Failed to restore tie-up.', 'error');
    } catch { addToast('Network error while restoring tie-up.', 'error'); }
    finally { setProcessingId(null); }
  };

  if (isLoading) return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="skeleton" style={{ height: 72, borderRadius: '12px', marginBottom: '2rem' }} />
      <div className="skeleton skeleton-card" style={{ height: 300 }} />
    </div>
  );

  if (error) return (
    <div className="animate-fadeIn" style={{ padding: '2rem' }}>
      <div className="card" style={{ borderColor: 'var(--danger-200)', background: 'var(--danger-50)', padding: '1.5rem' }}>
        <p style={{ color: 'var(--danger-700)', fontWeight: 600, margin: '0 0 0.5rem' }}>{error.message || 'Could not load employers.'}</p>
        <p className="text-sm text-secondary" style={{ margin: 0 }}>Confirm you are signed in as a college admin, then try again.</p>
      </div>
    </div>
  );

  const pendingCount = list.filter(e => e.status === 'pending').length;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>

      {/* Page Header — v0 standard, no gradient hero */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            Employers
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {list.length} employer{list.length !== 1 ? 's' : ''} with tie-up records
            </span>
            {pendingCount > 0 && (
              <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                <AlertCircle size={12} /> {pendingCount} pending approval
              </span>
            )}
          </div>
        </div>
        {pendingCount > 0 && (
          <Link href="/dashboard/college/employers/requests" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Review Requests →
          </Link>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border-default)', borderRadius: '12px' }}>
          <Building2 size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No employer tie-ups yet</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>
            When an employer requests access to your campus, they appear here.
          </p>
          <Link href="/dashboard/college/employers/requests" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>Review pending requests →</Link>
        </div>
      ) : (
        <>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search company, industry, or status…"
            filter={filter}
            onFilterChange={setFilter}
            filterOptions={EMPLOYER_STATUS_FILTER_OPTIONS}
            filterLabel="Status"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={totalCount}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
          {/* Desktop table — hidden on mobile */}
          <div className="card employers-table-wrap" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ width: 40, paddingLeft: '1.25rem' }}>#</th>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Hires</th>
                    <th style={{ textAlign: 'right' }}>Drives</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>POC</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center text-secondary">
                        No employers match your search or filters.
                      </td>
                    </tr>
                  ) : null}
                  {displayList.map((emp, index) => {
                    const rating = emp.reliability_score != null ? Number(emp.reliability_score) : null;
                    const pocNames = (emp.coordination_poc_user_ids || []).map((uid) => staffDirectory.find((s) => String(s.id) === String(uid))?.name).filter(Boolean);
                    return (
                      <tr key={emp.approval_id}>
                        <td style={{ color: 'var(--text-tertiary)', paddingLeft: '1.25rem', fontSize: '0.825rem' }}>{index + 1}</td>
                        <td>
                          <EmployerCompanyCell name={emp.name} website={emp.website} email={emp.email} />
                        </td>
                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{emp.industry || '—'}</td>
                        <td><span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{labelEmployerCompanyType(emp.company_type)}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.925rem' }}>{emp.past_hires ?? 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.925rem' }}>{emp.drives_count ?? 0}</td>
                        <td>
                          {rating != null && !Number.isNaN(rating) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Star size={13} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{rating.toFixed(1)}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>—</span>}
                        </td>
                        <td><StatusPill status={emp.status} /></td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '10rem' }}>
                          {pocNames.length ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Users size={12} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                              {pocNames.join(', ')}
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {emp.website && (
                              <a href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '0.35rem', border: '1px solid var(--border-default)' }} title="Visit website">
                                <ExternalLink size={13} />
                              </a>
                            )}
                            {emp.status === 'pending' && (
                              <Link
                                href="/dashboard/college/employers/requests"
                                className="btn btn-primary btn-icon btn-sm"
                                title="Review pending request"
                                aria-label="Review pending request"
                              >
                                <CheckCircle2 size={16} strokeWidth={2} aria-hidden />
                              </Link>
                            )}
                            {emp.status === 'approved' && (
                              <>
                                <StandardTableIconAction
                                  action="pocs"
                                  variant="ghost"
                                  onClick={() => setPocModal(emp)}
                                />
                                <StandardTableIconAction
                                  action="delete"
                                  variant="danger"
                                  disabled={!TIE_UP_REVOKE_ENABLED || processingId === emp.employer_id}
                                  loading={processingId === emp.employer_id}
                                  onClick={() => TIE_UP_REVOKE_ENABLED && setRevokeTarget({ id: emp.employer_id, name: emp.name })}
                                  tooltip={TIE_UP_REVOKE_ENABLED ? 'Revoke tie-up' : TIE_UP_REVOKE_DISABLED_TITLE}
                                />
                              </>
                            )}
                            {emp.status === 'revoked' && (
                              <StandardTableIconAction
                                action="restore"
                                variant="ghost"
                                loading={processingId === emp.employer_id}
                                disabled={processingId === emp.employer_id}
                                onClick={() => handleReinstate(emp.employer_id)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


        </>
      )}

      {/* POC Modal */}
      {pocModal && (
        <div className="modal-overlay" role="presentation" style={{ overflowY: 'auto', alignItems: 'flex-start' }} onClick={(e) => { if (e.target === e.currentTarget) setPocModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" style={{ borderRadius: '12px', overflow: 'hidden', maxWidth: 520, margin: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Assign Campus POCs</h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Coordinating with <strong>{pocModal.name}</strong></p>
              </div>
              <button type="button" onClick={() => setPocModal(null)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Select College Staff</label>
                {staffDirectory.length === 0 ? (
                  <p className="text-sm text-secondary">No placement coordinators found. Add college admin accounts for your team first.</p>
                ) : (
                  <select className="form-select" multiple style={{ height: `${Math.min(220, 36 + staffDirectory.length * 28)}px` }} value={pocStaffSelection} onChange={(e) => setPocStaffSelection(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                    {staffDirectory.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                )}
                <p className="text-xs text-tertiary" style={{ marginTop: '0.4rem' }}>Hold Ctrl/Cmd to select multiple staff members.</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPocModal(null)} disabled={pocSaving}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={pocSaving || staffDirectory.length === 0} onClick={async () => {
                setPocSaving(true);
                try {
                  const res = await fetch(`/api/college/employers/${pocModal.employer_id}/poc`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffUserIds: pocStaffSelection }) });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) { addToast(json.error || 'Could not save POC assignment.', 'error'); return; }
                  await mutate(); addToast('Campus POCs saved.', 'success'); setPocModal(null);
                } catch { addToast('Network error while saving.', 'error'); }
                finally { setPocSaving(false); }
              }}>
                <Shield size={15} /> {pocSaving ? 'Saving…' : 'Save POCs'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title={TIE_UP_REVOKE_MESSAGES.collegeConfirmTitle}
        message={revokeTarget ? TIE_UP_REVOKE_MESSAGES.collegeConfirmBody(revokeTarget.name) : ''}
        confirmLabel="Revoke tie-up & notify"
        confirmTone="danger"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={async () => {
          if (!revokeTarget) return;
          const targetId = revokeTarget.id;
          setRevokeTarget(null);
          await handleRevoke(targetId);
        }}
        loading={Boolean(revokeTarget && processingId === revokeTarget.id)}
      />


    </div>
  );
}
