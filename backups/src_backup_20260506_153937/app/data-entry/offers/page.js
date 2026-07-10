'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DataEntryOffersPage() {
  const [options, setOptions] = useState({ studentProfiles: [], drives: [], employers: [] });
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    studentId: '',
    driveId: '',
    employerId: '',
    jobTitle: '',
    location: '',
    salary: '',
    status: 'accepted',
    joiningDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [optionsRes, offersRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/offers'),
      ]);
      const optionsJson = await optionsRes.json();
      const offersJson = await offersRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!offersRes.ok) throw new Error(offersJson?.error || 'Failed to load offers');
      setOptions({
        studentProfiles: optionsJson.studentProfiles || [],
        drives: optionsJson.drives || [],
        employers: optionsJson.employers || [],
      });
      setRows(offersJson.offers || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      studentId: '',
      driveId: '',
      employerId: '',
      jobTitle: '',
      location: '',
      salary: '',
      status: 'accepted',
      joiningDate: '',
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      studentId: row.student_id || '',
      driveId: row.drive_id || '',
      employerId: row.employer_id || '',
      jobTitle: row.job_title || '',
      location: row.location || '',
      salary: row.salary ? String(row.salary) : '',
      status: row.status || 'accepted',
      joiningDate: row.joining_date ? String(row.joining_date).slice(0, 10) : '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/data-entry/offers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save offer');
      setSuccess(mode === 'add' ? 'Offer created' : 'Offer updated');
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete offer');
      setSuccess('Offer deleted');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '2rem' }}>
      <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Data Entry • Offers</h1>
            <p>Super-admin backfill only — same <code>offers</code> table as dashboards, but not the primary &quot;offer management&quot; flow.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Offer</button>
            <button type="button" className="btn btn-secondary" onClick={loadData}>Refresh</button>
            <Link href="/data-entry" className="btn btn-secondary">Back to list</Link>
          </div>
        </div>

        <div className="directive-panel" style={{ marginBottom: '1rem' }} role="note">
          <p className="directive-panel__title">Offer acceptance</p>
          <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
            Students record <strong>accept / decline</strong> on <strong>Dashboard → My Offers</strong>. Employers create offers from <strong>Dashboard → Offers</strong>.
            Use this screen only for exceptional data entry; prefer the dashboard flows for normal operations.
          </p>
        </div>

        {showForm && (
          <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">{mode === 'add' ? 'Add Offer' : 'Edit Offer'}</h3>
            </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Student profile</label>
              <select className="form-select" value={form.studentId} onChange={onChange('studentId')} required disabled={isLoading || mode === 'edit'}>
                <option value="">Select student profile</option>
                {options.studentProfiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {(sp.first_name || '').trim()} {(sp.last_name || '').trim()} ({sp.email || sp.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Drive (optional)</label>
              <select className="form-select" value={form.driveId} onChange={onChange('driveId')} disabled={isLoading}>
                <option value="">No drive selected</option>
                {options.drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Employer (optional)</label>
              <select className="form-select" value={form.employerId} onChange={onChange('employerId')} disabled={isLoading}>
                <option value="">No employer selected</option>
                {options.employers.map((e) => (
                  <option key={e.id} value={e.id}>{e.company_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={onChange('status')}>
                <option value="accepted">accepted</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
                <option value="expired">expired</option>
                <option value="revoked">revoked</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job title</label>
              <input className="form-input" value={form.jobTitle} onChange={onChange('jobTitle')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={onChange('location')} />
            </div>
            <div className="form-group">
              <label className="form-label">Salary (INR)</label>
              <input className="form-input" type="number" min="0" value={form.salary} onChange={onChange('salary')} />
            </div>
            <div className="form-group">
              <label className="form-label">Joining date</label>
              <input className="form-input" type="date" value={form.joiningDate} onChange={onChange('joiningDate')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Offer' : 'Update Offer'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          </form>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Existing Offers</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Job Title</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.first_name} {row.last_name || ''} ({row.email || '-'})</td>
                    <td>{row.job_title}</td>
                    <td>{row.salary ?? 0}</td>
                    <td>{row.status}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewRow(row)}>View</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>Edit</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(row.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 ? (
                  <tr><td colSpan={5} className="text-secondary">No offers found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {viewRow ? (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">Offer Details</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="text-sm">
              <div><strong>Student:</strong> {viewRow.first_name} {viewRow.last_name || ''}</div>
              <div><strong>Job Title:</strong> {viewRow.job_title}</div>
              <div><strong>Salary:</strong> {viewRow.salary ?? 0}</div>
              <div><strong>Status:</strong> {viewRow.status}</div>
              <div><strong>Drive:</strong> {viewRow.drive_title || '-'}</div>
              <div><strong>Employer:</strong> {viewRow.company_name || '-'}</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--danger-300)' }}>{error}</div> : null}
        {success ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--success-300)' }}>{success}</div> : null}
      </div>
    </div>
  );
}
