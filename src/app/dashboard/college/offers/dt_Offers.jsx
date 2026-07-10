'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, FILTER_ALL } from '@/lib/tableQueryPresets';
import { Send } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import CompanyNameLink from '@/components/CompanyNameLink';
import { toDateOnlyString } from '@/lib/dateOnly';
import { validateCollegeOfferPayload } from '@/lib/apiInputValidation';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'expired', 'revoked'];

const OFFER_TABLE_COLUMNS = [
  'Student',
  'College',
  'Role',
  'Salary',
  'Location',
  'Deadline',
  'Status',
  'Actions',
];

export default function DtCollegeOffers() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/offers', fetcher);
  const { data: studentsPayload } = useSWR('/api/college/students', fetcher);

  const offers = Array.isArray(data?.offers) ? data.offers : [];
  const offerFilterOptions = useMemo(
    () => [FILTER_ALL, ...STATUS_OPTIONS.map((s) => ({ value: s, label: formatStatus(s) }))],
    [],
  );
  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayOffers,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(offers, {
    getSearchText: (o) =>
      [o.student_name, o.roll_number, o.college_name, o.job_title, o.location, o.status].filter(Boolean).join(' '),
    filterFn: (row, f) => !f || String(row.status || '') === f,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });
  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0, avgSalary: 0 };
  const students = useMemo(() => {
    const list = Array.isArray(studentsPayload?.students)
      ? studentsPayload.students
      : Array.isArray(studentsPayload)
        ? studentsPayload
        : [];
    return list.map((s) => ({
      id: s.id,
      label: `${s.name || '—'} (${s.roll || 'no roll'})`,
    }));
  }, [studentsPayload]);

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({
    studentId: '',
    reportedCompanyName: '',
    jobTitle: '',
    salary: '',
    location: '',
    deadline: '',
    joiningDate: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const editingRow = useMemo(() => offers.find((o) => o.id === editId), [offers, editId]);

  const resetForm = () => {
    setForm({
      studentId: '',
      reportedCompanyName: '',
      jobTitle: '',
      salary: '',
      location: '',
      deadline: '',
      joiningDate: '',
      status: 'pending',
    });
  };

  const todayYmd = useMemo(() => toDateOnlyString(new Date()), []);

  const submitAdd = async () => {
    if (!form.studentId || !form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Student, company name, and job title are required.', 'warning');
      return;
    }
    const offerErr = validateCollegeOfferPayload({
      salary: form.salary,
      deadline: form.deadline,
      joiningDate: form.joiningDate,
    });
    if (offerErr) {
      addToast(offerErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId,
          reportedCompanyName: form.reportedCompanyName.trim(),
          jobTitle: form.jobTitle.trim(),
          salary: Number(form.salary || 0),
          location: form.location.trim() || null,
          deadline: form.deadline || null,
          joiningDate: form.joiningDate || null,
          status: form.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      addToast('Offer added.', 'success');
      setShowAdd(false);
      resetForm();
      await mutate();
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      studentId: row.student_id || '',
      reportedCompanyName: row.company_name || '',
      jobTitle: row.job_title || '',
      salary: row.salary != null ? String(row.salary) : '',
      location: row.location || '',
      deadline: row.deadline ? toDateOnlyString(row.deadline) : '',
      joiningDate: row.joining_date ? toDateOnlyString(row.joining_date) : '',
      status: row.status || 'pending',
    });
  };

  const submitEdit = async () => {
    if (!editId) return;
    if (!form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Company name and job title are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          reportedCompanyName: form.reportedCompanyName.trim(),
          jobTitle: form.jobTitle.trim(),
          salary: Number(form.salary || 0),
          location: form.location.trim() || null,
          deadline: form.deadline || null,
          joiningDate: form.joiningDate || null,
          status: form.status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast('Offer updated.', 'success');
      setEditId(null);
      resetForm();
      await mutate();
    } catch (err) {
      addToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (id) => {
    if (!confirm('Delete this offer row?')) return;
    try {
      const res = await fetch('/api/college/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      addToast('Offer removed.', 'success');
      await mutate();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const closeModals = useCallback(() => {
    setShowAdd(false);
    setEditId(null);
    setViewRow(null);
    resetForm();
  }, []);

  const summaryLine = isLoading
    ? 'Loading offers…'
    : error
      ? 'Could not load counts'
      : `${summary.total ?? offers.length} offers · ${summary.accepted ?? 0} accepted · ${summary.pending ?? 0} pending · ${summary.rejected ?? 0} declined`;

  const avgSalaryLine =
    !isLoading && !error && summary.avgSalary
      ? `Avg accepted salary ${formatCurrency(summary.avgSalary)}`
      : null;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {error ? (
        <div
          className="card"
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            background: 'var(--danger-50)',
            border: '1px solid var(--danger-200)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>
            {error.message || 'Could not load offers.'}
          </p>
        </div>
      ) : null}

      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.35rem',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Send size={24} aria-hidden />
            Placement offers
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{summaryLine}</p>
          {avgSalaryLine ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>{avgSalaryLine}</p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <StandardTableIconAction
            action="add"
            variant="primary"
            onClick={() => {
              resetForm();
              setShowAdd(true);
              setEditId(null);
            }}
          />
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="Student acceptance" style={{ marginBottom: '1rem' }}>
        <p className="directive-panel__title">When students use the app</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          If the student signs in, they can accept or decline <strong>pending</strong> rows on <strong>My Offers</strong>; status then syncs here. You can also set
          status manually when you already know the outcome (e.g. accepted from email). To roll back a mistaken status, open <strong>Edit</strong>, set{' '}
          <strong>Status</strong> to <strong>pending</strong> again, and save — or use <strong>Delete</strong> to remove a row (an older revision may become current
          automatically).
        </p>
      </div>

      {(showAdd || editId) && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">{editId ? 'Edit offer' : 'Add offer'}</h3>
          {!editId && (
            <div className="form-group">
              <label className="form-label">Student (master list)</label>
              <select
                className="form-select"
                value={form.studentId}
                onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Company name (text)</label>
              <input
                className="form-input"
                value={form.reportedCompanyName}
                onChange={(e) => setForm((p) => ({ ...p, reportedCompanyName: e.target.value }))}
                placeholder="As shared with the student / email"
                disabled={Boolean(editId && editingRow?.linked_employer)}
              />
              {editId && editingRow?.linked_employer ? (
                <p className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                  Company comes from the employer account for this row; edit other fields as needed.
                </p>
              ) : null}
            </div>
            <div className="form-group">
              <label className="form-label">Role / job title</label>
              <input
                className="form-input"
                value={form.jobTitle}
                onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salary (INR annual)</label>
              <ValidatedNumberInput
                fieldId={FIELD_IDS.COLLEGE_OFFER_SALARY}
                value={form.salary}
                onChange={(v) => setForm((p) => ({ ...p, salary: v }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Response deadline</label>
              <ValidatedDateInput
                fieldId={FIELD_IDS.COLLEGE_OFFER_DEADLINE}
                value={form.deadline}
                onChange={(v) => setForm((p) => ({ ...p, deadline: v }))}
              />
              <label className="form-label" style={{ marginTop: '0.75rem' }}>
                Joining date
              </label>
              <ValidatedDateInput
                fieldId={FIELD_IDS.COLLEGE_OFFER_JOINING}
                context={{ deadline: form.deadline }}
                value={form.joiningDate}
                onChange={(v) => setForm((p) => ({ ...p, joiningDate: v }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={editId ? submitEdit : submitAdd}>
              {saving ? 'Saving…' : editId ? 'Save changes' : 'Create'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeModals}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isLoading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search student, role, or company…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={offerFilterOptions}
          filterLabel="Status"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        <div className="table-container" style={{ border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {OFFER_TABLE_COLUMNS.map((col, i) => (
                <th
                  key={col}
                  style={
                    i === 0
                      ? { paddingLeft: '1.5rem' }
                      : i === OFFER_TABLE_COLUMNS.length - 1
                        ? { paddingRight: '1.5rem' }
                        : undefined
                  }
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && !offers.length ? (
              <tr>
                <td colSpan={OFFER_TABLE_COLUMNS.length} style={{ padding: '2rem 1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-md)' }} />
                    ))}
                  </div>
                </td>
              </tr>
            ) : null}
            {!isLoading && !error && displayOffers.length === 0 && totalCount > 0 ? (
              <tr>
                <td colSpan={OFFER_TABLE_COLUMNS.length} className="text-center text-secondary">
                  No offers match your search or filters.
                </td>
              </tr>
            ) : null}
            {!isLoading &&
              !error &&
              displayOffers.map((offer) => (
              <tr key={offer.id}>
                <td className="font-semibold" style={{ paddingLeft: '1.5rem' }}>
                  {offer.student_name}
                  {offer.roll_number ? <div className="text-xs text-tertiary font-mono">{offer.roll_number}</div> : null}
                </td>
                <td>{offer.college_name || '—'}</td>
                <td>{offer.job_title || '—'}</td>
                <td>{offer.salary ? formatCurrency(Number(offer.salary)) : '—'}</td>
                <td>{offer.location || '—'}</td>
                <td>{offer.deadline ? formatDate(offer.deadline) : '—'}</td>
                <td>
                  <span className={`badge badge-${getStatusColor(offer.status)} badge-dot`}>{formatStatus(offer.status)}</span>
                </td>
                <td style={{ paddingRight: '1.5rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                    <StandardTableIconAction action="view" onClick={() => setViewRow(offer)} />
                    <StandardTableIconAction
                      action="edit"
                      onClick={() => {
                        setShowAdd(false);
                        openEdit(offer);
                      }}
                    />
                    <StandardTableIconAction action="delete" variant="danger" onClick={() => removeOffer(offer.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !error && offers.length === 0 ? (
              <tr>
                <td colSpan={OFFER_TABLE_COLUMNS.length} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <Send size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} aria-hidden />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No offers yet</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Use Add offer above to log off-platform placements.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </div>

      {viewRow && (
        <div
          className="card"
          style={{
            marginTop: '1rem',
            border: '1px solid var(--border)',
            position: 'sticky',
            bottom: '1rem',
            zIndex: 2,
          }}
        >
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <h3 className="card-title">Offer detail</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>
              Close
            </button>
          </div>
          <div className="text-sm" style={{ lineHeight: 1.7 }}>
            <div>
              <strong>Student:</strong> {viewRow.student_name} ({viewRow.roll_number || '—'})
            </div>
            <div>
              <strong>College:</strong> {viewRow.college_name}
            </div>
            <div>
              <strong>Company:</strong>{' '}
              <CompanyNameLink name={viewRow.company_name} website={viewRow.company_website} />
            </div>
            <div>
              <strong>Role:</strong> {viewRow.job_title || '—'}
            </div>
            <div>
              <strong>Salary:</strong> {viewRow.salary ? formatCurrency(Number(viewRow.salary)) : '—'}
            </div>
            <div>
              <strong>Location:</strong> {viewRow.location || '—'}
            </div>
            <div>
              <strong>Deadline:</strong> {viewRow.deadline ? formatDate(viewRow.deadline) : '—'}
            </div>
            <div>
              <strong>Status:</strong> {formatStatus(viewRow.status)}
            </div>
            <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem' }}>
              Linked employer account: {viewRow.linked_employer ? 'yes' : 'no (college-reported text company)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
