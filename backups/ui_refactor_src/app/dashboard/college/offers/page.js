'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { FileUp, Send } from 'lucide-react';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { downloadCollegeOffersTemplate } from '@/lib/collegeOffersCsvTemplate';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'expired', 'revoked'];

export default function CollegeOffersPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/offers', fetcher);
  const { data: studentsRaw } = useSWR('/api/college/students', fetcher);

  const offers = Array.isArray(data?.offers) ? data.offers : [];
  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0, avgSalary: 0 };
  const students = useMemo(
    () =>
      Array.isArray(studentsRaw)
        ? studentsRaw.map((s) => ({ id: s.id, label: `${s.name || '—'} (${s.roll || 'no roll'})` }))
        : [],
    [studentsRaw],
  );

  const [uploading, setUploading] = useState(false);
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
      status: 'pending',
    });
  };

  const downloadAssessmentStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV lists all campus master-list students (company from newest assessment when present). Add job details, then upload.', 'success');
    } catch (err) {
      addToast(err.message || 'Download failed', 'error');
    }
  };

  const onUploadCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/college/offers/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const { accepted, errors } = json;
      addToast(`Imported ${accepted} row(s).${errors?.length ? ` ${errors.length} issue(s) — see below.` : ''}`, accepted ? 'success' : 'warning');
      if (errors?.length) {
        console.warn('CSV import issues', errors);
        addToast(errors.slice(0, 3).map((x) => `Line ${x.line}: ${x.message}`).join(' · '), 'error');
      }
      await mutate();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submitAdd = async () => {
    if (!form.studentId || !form.reportedCompanyName.trim() || !form.jobTitle.trim()) {
      addToast('Student, company name, and job title are required.', 'warning');
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
      deadline: row.deadline ? String(row.deadline).slice(0, 10) : '',
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

  return (
    <div className="animate-fadeIn">
      {error ? (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            borderColor: 'var(--danger-300)',
            background: 'var(--danger-50)',
            color: 'var(--danger-800)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Could not load offers from the server</p>
          <p className="text-sm" style={{ margin: '0.5rem 0 0', opacity: 0.95 }}>
            {error.message || 'Unknown error'}. You can still try CSV import below; if this persists, confirm migration{' '}
            <code style={{ fontSize: '0.85em' }}>018_college_offers_reported_company.sql</code> is applied and reload.
          </p>
        </div>
      ) : null}

      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={22} aria-hidden /> Offers
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
            Record placement offers for your campus (including email / off-platform rollouts). Add rows manually or import CSV.{' '}
            <Link href="/dashboard/college/offers-upload" className="link-inline" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              <FileUp size={14} style={{ verticalAlign: '-0.125em', marginRight: '0.2rem' }} aria-hidden />
              Full-screen CSV upload
            </Link>
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadCollegeOffersTemplate}>
            Blank CSV template
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter}>
            Offers CSV (all students)
          </button>
          <label className="btn btn-secondary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
            {uploading ? 'Importing…' : 'Upload CSV'}
            <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={onUploadCsv} />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => { resetForm(); setShowAdd(true); setEditId(null); }}>
            + Add offer
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Import offers from CSV
        </h3>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Download the template, fill one row per offer (roll numbers must exist under <strong>Students</strong>), then upload. Same actions are in the page header.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadCollegeOffersTemplate}>
            Blank template
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter}>
            All students → offers CSV
          </button>
          <label className="btn btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
            {uploading ? 'Importing…' : 'Choose CSV file to import'}
            <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={onUploadCsv} />
          </label>
        </div>
      </div>

      <div className="directive-panel" role="region" aria-label="Offer import rules" style={{ marginBottom: '1rem' }}>
        <p className="directive-panel__title">Validation (not tied to assessments)</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Each row must match a student in your <strong>master student list</strong> (roll number on your Students screen). We do <strong>not</strong> require that the
          student appeared in employer assessment CSVs. Assessment outcomes are irrelevant for this screen — you can log offers even when everything happened over
          email. Optional <strong>status</strong> in CSV: pending, accepted, rejected, expired, revoked (defaults to pending).
        </p>
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

      <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stats-card">
          <div className="stats-card-label">Total Offers</div>
          <div className="stats-card-value">{summary.total}</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-label">Accepted</div>
          <div className="stats-card-value">{summary.accepted}</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-label">Pending</div>
          <div className="stats-card-value">{summary.pending}</div>
        </div>
        <div className="stats-card rose">
          <div className="stats-card-label">Rejected / declined</div>
          <div className="stats-card-value">{summary.rejected ?? 0}</div>
        </div>
      </div>
      <div className="stats-card blue" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div className="stats-card-label">Avg accepted salary (INR)</div>
        <div className="stats-card-value">{summary.avgSalary ? formatCurrency(summary.avgSalary) : '—'}</div>
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
              <input
                className="form-input"
                type="number"
                value={form.salary}
                onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
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
              <input
                className="form-input"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
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

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>College</th>
              <th>Role</th>
              <th>Salary</th>
              <th>Location</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td className="font-semibold">
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
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewRow(offer)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setShowAdd(false);
                        openEdit(offer);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOffer(offer.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && offers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-secondary">
                  {error?.message || 'No offers yet. Add manually or import CSV.'}
                </td>
              </tr>
            ) : null}
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
              <strong>Student:</strong> {viewRow.student_name} ({viewRow.roll_number || '—'})
            </div>
            <div>
              <strong>College:</strong> {viewRow.college_name}
            </div>
            <div>
              <strong>Company:</strong> {viewRow.company_name || '—'}
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
