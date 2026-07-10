'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { FileUp, Eye, Pencil, RotateCcw, Ban, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load offers');
  return data;
};

export default function EmployerOffersPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/offers', fetcher);
  const { data: optionsData } = useSWR('/api/employer/offers/options', fetcher);
  const offers = data?.offers || [];
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({
    studentId: '',
    driveId: '',
    jobTitle: '',
    salary: '',
    location: '',
    joiningDate: '',
    deadlineAt: '',
  });
  const [editForm, setEditForm] = useState({
    driveId: '',
    jobTitle: '',
    salary: '',
    location: '',
    joiningDate: '',
    deadlineAt: '',
  });

  const students = Array.isArray(optionsData?.students) ? optionsData.students : [];
  const drives = Array.isArray(optionsData?.drives) ? optionsData.drives : [];

  const submitCreateOffer = async () => {
    if (!form.studentId || !form.jobTitle.trim()) {
      addToast('Student and job title are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: Number(form.salary || 0),
          deadlineAt: form.deadlineAt ? new Date(`${form.deadlineAt}T23:59:59`).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to create offer');
      setShowCreate(false);
      setForm({ studentId: '', driveId: '', jobTitle: '', salary: '', location: '', joiningDate: '', deadlineAt: '' });
      await mutate();
      addToast('Offer created successfully.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to create offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeOffer = async (id) => {
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'revoked' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to revoke offer');
      await mutate();
      addToast('Offer revoked.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to revoke offer', 'error');
    }
  };

  const reopenOffer = async (id) => {
    if (
      !confirm(
        'Reopen this offer as pending? Clears acceptance / decline timestamps so the student can respond again on My Offers (if applicable).',
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'pending' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to reopen offer');
      await mutate();
      addToast('Offer set back to pending.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to reopen offer', 'error');
    }
  };

  const openEdit = (offer) => {
    setEditId(offer.id);
    setShowCreate(false);
    setViewRow(null);
    setEditForm({
      driveId: offer.drive_id || '',
      jobTitle: offer.job_title || '',
      salary: offer.salary != null ? String(offer.salary) : '',
      location: offer.location || '',
      joiningDate: offer.joining_date ? String(offer.joining_date).slice(0, 10) : '',
      deadlineAt: offer.deadline_at ? String(offer.deadline_at).slice(0, 10) : '',
    });
  };

  const submitEditOffer = async () => {
    if (!editId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          driveId: editForm.driveId || null,
          jobTitle: editForm.jobTitle.trim(),
          salary: Number(editForm.salary || 0),
          location: editForm.location.trim() || null,
          joiningDate: editForm.joiningDate || null,
          deadlineAt: editForm.deadlineAt ? new Date(`${editForm.deadlineAt}T23:59:59`).toISOString() : null,
          syncReportedCompanyFromProfile: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to update offer');
      setEditId(null);
      await mutate();
      addToast('Offer updated.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!confirm('Delete this offer row permanently? History for that student may show a previous revision as current.')) return;
    try {
      const res = await fetch('/api/employer/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to delete offer');
      if (editId === id) setEditId(null);
      if (viewRow?.id === id) setViewRow(null);
      await mutate();
      addToast('Offer removed.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to delete offer', 'error');
    }
  };

  const downloadAssessmentStarter = async () => {
    try {
      await downloadCsvFromApi('/api/employer/offers/assessment-starter', EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV lists all master-list students on every approved campus (tenant_id per row). Add job titles, then import.', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  const getOffersCsv = useCallback((_scope) => {
    const list = offers;
    const headers = ['Student', 'College', 'Role', 'Salary_INR', 'Salary_display', 'Location', 'Deadline', 'Status', 'Created'];
    const rows = list.map((o) => [
      o.student_name || '—',
      o.college_name || '—',
      o.job_title || '—',
      String(Number(o.salary) || 0),
      formatCurrency(Number(o.salary) || 0),
      o.location || '—',
      o.deadline_at || '',
      o.status || '',
      o.created_at || '',
    ]);
    return { headers, rows };
  }, [offers]);

  if (isLoading) {
    return <div className="skeleton skeleton-card" style={{ height: 260, margin: '2rem' }} />;
  }

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load offers.'}</p>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          Confirm you are signed in as an employer, then reload or contact support if this continues.
        </p>
      </div>
    );
  }

  const acceptedCount = offers.filter((offer) => offer.status === 'accepted').length;
  const pendingCount = offers.filter((offer) => offer.status === 'pending').length;
  const declinedCount = offers.filter((offer) => ['rejected', 'declined'].includes(offer.status)).length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📨 Offers</h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', lineHeight: 1.55 }}>
            Manage offers extended to candidates. CSV import defaults to <strong>accepted</strong> (offers already taken outside the app). Use{' '}
            <strong>Create Offer</strong> below for <strong>pending</strong> rows students accept on <strong>My Offers</strong>.{' '}
            <Link href="/dashboard/employer/offers-upload" className="link-inline" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              <FileUp size={14} style={{ verticalAlign: '-0.125em', marginRight: '0.2rem' }} aria-hidden />
              Import offers from CSV
            </Link>
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter}>
            Offers CSV (all students)
          </button>
          <ExportCsvSplitButton
            filenameBase="placement_offers"
            currentCount={offers.length}
            fullCount={offers.length}
            getRows={getOffersCsv}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCreate((v) => !v);
              setEditId(null);
            }}
          >
            {showCreate ? 'Close Form' : '+ Create Offer'}
          </button>
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="Offer acceptance">
        <p className="directive-panel__title">Pending vs accepted</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          <strong>Pending</strong> — created here with <strong>Create Offer</strong> (or set <code>status=pending</code> in CSV); students <strong>accept or decline</strong>{' '}
          on <strong>Dashboard → My Offers</strong>. <strong>Accepted</strong> — use CSV import (default) or set <code>status=accepted</code> when the hire is already
          confirmed outside the app; those rows skip the student confirmation step.
        </p>
      </div>

      <div className="directive-panel" role="region" aria-label="One row per student">
        <p className="directive-panel__title">Why several rows can look the same</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Each row is <strong>one student</strong>. If five students received the same package, you will see <strong>five lines</strong> with matching role, salary,
          and location — that is expected. The app hides older <em>revisions</em> for the same student and company (the current one is marked in the database as latest);
          it does not collapse different students into one template row. If the same student still shows two &quot;current&quot; offers from one company, company naming
          may be split (e.g. college CSV spelling vs your profile name); use migration 021 and align names, or edit the college-reported row.
        </p>
      </div>

      {editId && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">Edit offer</h3>
          <p className="text-sm text-secondary" style={{ marginTop: 0, marginBottom: '1rem' }}>
            Updates terms for this row. Company text is synced from your employer profile for deduplication. Use <strong>Reopen to pending</strong> in the table to roll
            back status after accept/decline/revoke.
          </p>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Drive (optional)</label>
              <select
                className="form-select"
                value={editForm.driveId}
                onChange={(e) => setEditForm((p) => ({ ...p, driveId: e.target.value }))}
              >
                <option value="">Not linked</option>
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.drive_date ? `(${formatDate(d.drive_date)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job title</label>
              <input
                className="form-input"
                value={editForm.jobTitle}
                onChange={(e) => setEditForm((p) => ({ ...p, jobTitle: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salary (INR annual)</label>
              <input
                className="form-input"
                type="number"
                value={editForm.salary}
                onChange={(e) => setEditForm((p) => ({ ...p, salary: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                value={editForm.location}
                onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Joining date</label>
              <input
                className="form-input"
                type="date"
                value={editForm.joiningDate}
                onChange={(e) => setEditForm((p) => ({ ...p, joiningDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Response deadline</label>
              <input
                className="form-input"
                type="date"
                value={editForm.deadlineAt}
                onChange={(e) => setEditForm((p) => ({ ...p, deadlineAt: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={submitEditOffer} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Student</label>
              <select className="form-select" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}>
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.collegeName ? ` — ${s.collegeName}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Drive (optional)</label>
              <select className="form-select" value={form.driveId} onChange={(e) => setForm((p) => ({ ...p, driveId: e.target.value }))}>
                <option value="">Not linked</option>
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>{d.title} {d.drive_date ? `(${formatDate(d.drive_date)})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job title</label>
              <input className="form-input" value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Salary (INR annual)</label>
              <input className="form-input" type="number" value={form.salary} onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Joining date</label>
              <input className="form-input" type="date" value={form.joiningDate} onChange={(e) => setForm((p) => ({ ...p, joiningDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Response deadline</label>
              <input className="form-input" type="date" value={form.deadlineAt} onChange={(e) => setForm((p) => ({ ...p, deadlineAt: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={submitCreateOffer} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card green"><div className="stats-card-icon green">✅</div><div className="stats-card-value">{acceptedCount}</div><div className="stats-card-label">Accepted</div></div>
        <div className="stats-card amber"><div className="stats-card-icon amber">⏳</div><div className="stats-card-value">{pendingCount}</div><div className="stats-card-label">Pending</div></div>
        <div className="stats-card rose"><div className="stats-card-icon rose">❌</div><div className="stats-card-value">{declinedCount}</div><div className="stats-card-label">Declined</div></div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>College</th><th>Role</th><th>Salary</th><th>Location</th><th>Deadline</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {offers.map(offer => (
              <tr key={offer.id}>
                <td className="font-semibold">{offer.student_name || '—'}</td>
                <td className="text-sm">{offer.college_name || '—'}</td>
                <td>{offer.job_title || '—'}</td>
                <td className="font-bold">{formatCurrency(Number(offer.salary) || 0)}</td>
                <td>{offer.location || '—'}</td>
                <td className="text-sm">{offer.deadline_at ? formatDate(offer.deadline_at) : '—'}</td>
                <td><span className={`badge badge-${getStatusColor(offer.status)} badge-dot`}>{formatStatus(offer.status || 'unknown')}</span></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="View details"
                      aria-label="View offer details"
                      onClick={() => setViewRow(offer)}
                    >
                      <Eye size={16} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Edit offer"
                      aria-label="Edit offer"
                      onClick={() => openEdit(offer)}
                    >
                      <Pencil size={16} strokeWidth={2} aria-hidden />
                    </button>
                    {['accepted', 'rejected', 'revoked', 'expired'].includes(offer.status) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon btn-sm"
                        title="Reopen as pending"
                        aria-label="Reopen offer as pending"
                        onClick={() => reopenOffer(offer.id)}
                      >
                        <RotateCcw size={16} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                    {offer.status === 'pending' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-icon btn-sm"
                        title="Revoke offer"
                        aria-label="Revoke offer"
                        onClick={() => revokeOffer(offer.id)}
                      >
                        <Ban size={16} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger btn-icon btn-sm"
                      title="Delete offer"
                      aria-label="Delete offer"
                      onClick={() => deleteOffer(offer.id)}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No offers found for your employer account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <strong>Student:</strong> {viewRow.student_name}
            </div>
            <div>
              <strong>College:</strong> {viewRow.college_name || '—'}
            </div>
            <div>
              <strong>Role:</strong> {viewRow.job_title || '—'}
            </div>
            <div>
              <strong>Salary:</strong> {formatCurrency(Number(viewRow.salary) || 0)}
            </div>
            <div>
              <strong>Location:</strong> {viewRow.location || '—'}
            </div>
            <div>
              <strong>Joining:</strong> {viewRow.joining_date ? formatDate(viewRow.joining_date) : '—'}
            </div>
            <div>
              <strong>Deadline:</strong> {viewRow.deadline_at ? formatDate(viewRow.deadline_at) : '—'}
            </div>
            <div>
              <strong>Status:</strong> {formatStatus(viewRow.status)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
