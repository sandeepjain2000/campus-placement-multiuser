'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  COMMON_SORT_OPTIONS,
  EMPLOYER_VERIFIED_FILTER_OPTIONS,
  employerVerifiedFilterFn,
} from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import AdminRecordModal from '@/components/admin/AdminRecordModal';
import CompanyNameLink from '@/components/CompanyNameLink';
import { useToast } from '@/components/ToastProvider';
import { validateAdminEmployerForm } from '@/lib/adminEmployerForm';

function employerToForm(e) {
  return {
    name: e?.name || '',
    industry: e?.industry || '',
    website: e?.website || '',
    headquarters: e?.headquarters || '',
    contactPerson: e?.contactPerson || '',
    contactEmail: e?.contactEmail || '',
    contactPhone: e?.contactPhone || '',
    verified: Boolean(e?.verified),
    blacklisted: Boolean(e?.blacklisted),
    blacklistReason: e?.blacklistReason || '',
    accountActive: e?.accountActive !== false,
  };
}

function DetailRow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div className="text-sm" style={{ marginTop: '0.15rem' }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminEmployersPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [employers, setEmployers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [panelMode, setPanelMode] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(employerToForm(null));
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const updateForm = useCallback((patch) => {
    setSaveError('');
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadEmployers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/employers');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load employers');
      setEmployers(Array.isArray(json.employers) ? json.employers : []);
      setListError('');
    } catch (e) {
      setListError(e.message || 'Failed to load employers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployers();
  }, [loadEmployers]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayEmployers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(employers, {
    getSearchText: (e) => [e.name, e.industry].filter(Boolean).join(' '),
    filterFn: employerVerifiedFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  const closePanel = () => {
    setPanelMode(null);
    setSelectedId(null);
    setDetail(null);
    setPanelError('');
    setSaveError('');
  };

  const openPanel = async (id, mode) => {
    setSelectedId(id);
    setPanelMode(mode);
    setPanelLoading(true);
    setPanelError('');
    setSaveError('');
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/employers/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load employer');
      setDetail(json.employer);
      if (mode === 'edit') setForm(employerToForm(json.employer));
    } catch (e) {
      setPanelError(e.message || 'Failed to load employer');
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    if (openedFromQuery.current || isLoading) return;
    const viewId = String(searchParams.get('view') || '').trim();
    if (!viewId) return;
    openedFromQuery.current = true;
    void openPanel(viewId, 'view');
  }, [isLoading, searchParams]);

  const saveEmployer = async () => {
    if (!selectedId) return;

    const validationErr = validateAdminEmployerForm(form);
    if (validationErr) {
      setSaveError(validationErr);
      addToast(validationErr, 'warning');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/employers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || 'Failed to save employer';
        setSaveError(msg);
        addToast(msg, 'warning');
        return;
      }
      addToast('Employer updated', 'success');
      setDetail(json.employer);
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === json.employer.id
            ? {
                ...e,
                name: json.employer.name,
                website: json.employer.website,
                industry: json.employer.industry || '—',
                verified: json.employer.verified,
                blacklisted: json.employer.blacklisted,
                active: json.employer.accountActive,
              }
            : e,
        ),
      );
      setPanelMode('view');
      setSaveError('');
    } catch (e) {
      const msg = e.message || 'Failed to save employer';
      setSaveError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployerActive = async (nextActive) => {
    if (!selectedId || !detail) return;
    const action = nextActive ? 'Reactivate' : 'Deactivate';
    const prompt = nextActive
      ? `Reactivate the employer login for ${detail.name}? They will be able to sign in again.`
      : `Deactivate the employer account for ${detail.name}? They will not be able to sign in until reactivated.`;
    if (!window.confirm(prompt)) return;

    setTogglingActive(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/employers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...employerToForm(detail), accountActive: nextActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || `Failed to ${action.toLowerCase()} employer`;
        setSaveError(msg);
        addToast(msg, 'warning');
        return;
      }
      setDetail(json.employer);
      setForm(employerToForm(json.employer));
      setEmployers((prev) =>
        prev.map((e) =>
          e.id === json.employer.id ? { ...e, active: json.employer.accountActive } : e,
        ),
      );
      addToast(
        nextActive ? 'Employer account reactivated.' : 'Employer account deactivated.',
        'success',
      );
    } catch (e) {
      const msg = e.message || `Failed to ${action.toLowerCase()} employer`;
      setSaveError(msg);
      addToast(msg, 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  const getExportRows = (scope = 'current') => {
    const headers = ['Company', 'Industry', 'Total Hires', 'Verified', 'Account'];
    const source = scope === 'full' ? employers : displayEmployers;
    const rowsList = source.map((e) => [
      e.name,
      e.industry,
      String(e.hires),
      e.verified ? 'Yes' : 'No',
      e.active !== false ? 'Active' : 'Inactive',
    ]);
    return { headers, rows: rowsList };
  };

  const selectedName = detail?.name || employers.find((e) => e.id === selectedId)?.name || 'Employer';

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🏢 Manage Employers</h1>
          <p>All registered employers on the platform</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Link className="btn btn-secondary" href="/dashboard/admin/pending-registrations">
            Onboard colleges & employers
          </Link>
          <ExportCsvSplitButton
            filenameBase="admin_employers"
            currentCount={displayEmployers.length}
            fullCount={employers.length}
            getRows={getExportRows}
          />
        </div>
      </div>

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search company or industry…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={EMPLOYER_VERIFIED_FILTER_OPTIONS}
          filterLabel="Verification"
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
              <th>Company</th>
              <th>Industry</th>
              <th>Total Hires</th>
              <th>Verified</th>
              <th>Account</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayEmployers.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
                  No employers match your search or filters.
                </td>
              </tr>
            ) : null}
            {displayEmployers.map((e) => (
              <tr
                key={e.id}
                className="admin-row-clickable"
                tabIndex={0}
                role="button"
                aria-label={`View ${e.name} profile`}
                onClick={() => openPanel(e.id, 'view')}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    openPanel(e.id, 'view');
                  }
                }}
              >
                <td className="font-semibold" onClick={(ev) => ev.stopPropagation()}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="admin-entity-name-btn"
                      onClick={() => openPanel(e.id, 'view')}
                    >
                      {e.name}
                    </button>
                    {e.website ? (
                      <CompanyNameLink
                        name="Website"
                        website={e.website}
                        className="text-xs"
                        style={{ fontWeight: 500 }}
                      />
                    ) : null}
                  </div>
                </td>
                <td>{e.industry}</td>
                <td>{e.hires}</td>
                <td>
                  {e.blacklisted ? (
                    <span className="badge badge-red">Blocked</span>
                  ) : e.verified ? (
                    <span className="badge badge-green">✅ Verified</span>
                  ) : (
                    <span className="badge badge-amber">Pending</span>
                  )}
                </td>
                <td>
                  {e.active === false ? (
                    <span className="badge badge-gray">Inactive</span>
                  ) : (
                    <span className="badge badge-green">Active</span>
                  )}
                </td>
                <td onClick={(ev) => ev.stopPropagation()}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <StandardTableIconAction action="view" onClick={() => openPanel(e.id, 'view')} />
                    <StandardTableIconAction action="edit" onClick={() => openPanel(e.id, 'edit')} />
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && totalCount === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-secondary">
                  {listError || 'No employers found.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminRecordModal
        title={selectedName}
        mode={panelMode}
        loading={panelLoading}
        saving={saving}
        error={panelError}
        onClose={closePanel}
        onSave={saveEmployer}
        footer={
          panelMode === 'view' && detail && !panelLoading && !panelError ? (
            <>
              {detail.accountActive ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={togglingActive || saving}
                  onClick={() => toggleEmployerActive(false)}
                >
                  {togglingActive ? 'Updating…' : 'Deactivate account'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={togglingActive || saving}
                  onClick={() => toggleEmployerActive(true)}
                >
                  {togglingActive ? 'Updating…' : 'Reactivate account'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setForm(employerToForm(detail));
                  setSaveError('');
                  setPanelMode('edit');
                }}
              >
                Edit employer
              </button>
            </>
          ) : null
        }
      >
        {panelMode === 'view' && detail ? (
          <div className="text-sm" style={{ lineHeight: 1.6 }}>
            <DetailRow label="Company">
              <CompanyNameLink name={detail.name} website={detail.website} />
            </DetailRow>
            <DetailRow label="Industry">{detail.industry || '—'}</DetailRow>
            <DetailRow label="Headquarters">{detail.headquarters || '—'}</DetailRow>
            <DetailRow label="Contact">{detail.contactPerson || '—'}</DetailRow>
            <DetailRow label="Contact email">{detail.contactEmail || '—'}</DetailRow>
            <DetailRow label="Contact phone">{detail.contactPhone || '—'}</DetailRow>
            <DetailRow label="Account login">{detail.accountEmail || '—'}</DetailRow>
            <DetailRow label="Account holder">{detail.accountName || '—'}</DetailRow>
            <DetailRow label="Total hires">{detail.hires}</DetailRow>
            <DetailRow label="Verified">{detail.verified ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Blocked">{detail.blacklisted ? detail.blacklistReason || 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Account status">{detail.accountActive ? 'Active' : 'Inactive'}</DetailRow>
          </div>
        ) : null}

        {panelMode === 'edit' && detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {saveError ? (
              <div
                className="card"
                role="alert"
                style={{ borderColor: 'var(--danger-500)', padding: '0.85rem 1rem', marginBottom: 0 }}
              >
                <p style={{ margin: 0, color: 'var(--danger-600)', fontSize: '0.875rem' }}>{saveError}</p>
              </div>
            ) : null}
            <div className="form-group">
              <label className="form-label">Company name</label>
              <input className="form-input" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <input className="form-input" value={form.industry} onChange={(e) => updateForm({ industry: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="https://…" />
            </div>
            <div className="form-group">
              <label className="form-label">Headquarters</label>
              <input className="form-input" value={form.headquarters} onChange={(e) => updateForm({ headquarters: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact person</label>
              <input className="form-input" value={form.contactPerson} onChange={(e) => updateForm({ contactPerson: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact email</label>
              <input className="form-input" type="email" value={form.contactEmail} onChange={(e) => updateForm({ contactEmail: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact phone</label>
              <input
                className="form-input"
                value={form.contactPhone}
                onChange={(e) => updateForm({ contactPhone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.accountActive}
                onChange={(e) => updateForm({ accountActive: e.target.checked })}
              />
              <span className="text-sm">Employer account is active (can sign in)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.verified} onChange={(e) => updateForm({ verified: e.target.checked })} />
              <span className="text-sm">Mark as verified employer</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.blacklisted} onChange={(e) => updateForm({ blacklisted: e.target.checked })} />
              <span className="text-sm">Block employer from campus access</span>
            </label>
            {form.blacklisted ? (
              <div className="form-group">
                <label className="form-label">Block reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.blacklistReason}
                  onChange={(e) => updateForm({ blacklistReason: e.target.value })}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminRecordModal>
    </div>
  );
}
