'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DataEntryPlacementDrivesPage() {
  const [employers, setEmployers] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    status: 'scheduled',
    driveDate: '',
    venue: '',
    maxStudents: '',
    employerId: '',
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
      const [optionsRes, drivesRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/placement-drives'),
      ]);
      const optionsJson = await optionsRes.json();
      const drivesJson = await drivesRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!drivesRes.ok) throw new Error(drivesJson?.error || 'Failed to load placement drives');
      setEmployers(optionsJson.employers || []);
      setRows(drivesJson.placementDrives || []);
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
      title: '',
      description: '',
      status: 'scheduled',
      driveDate: '',
      venue: '',
      maxStudents: '',
      employerId: '',
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      status: row.status || 'scheduled',
      driveDate: row.drive_date ? String(row.drive_date).slice(0, 10) : '',
      venue: row.venue || '',
      maxStudents: row.max_students ? String(row.max_students) : '',
      employerId: row.employer_id || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch('/api/data-entry/placement-drives', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save drive');
      setSuccess(mode === 'add' ? 'Placement drive created' : 'Placement drive updated');
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this placement drive?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/placement-drives', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete drive');
      setSuccess('Placement drive deleted');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '2rem' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Data Entry • Placement Drives</h1>
            <p>Create real drive records used in college dashboard counts.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Drive</button>
            <button type="button" className="btn btn-secondary" onClick={loadData}>Refresh</button>
            <Link href="/data-entry" className="btn btn-secondary">Back to list</Link>
          </div>
        </div>

        {showForm && (
          <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">{mode === 'add' ? 'Add Placement Drive' : 'Edit Placement Drive'}</h3>
            </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={onChange('title')} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={form.description} onChange={onChange('description')} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={onChange('status')}>
                <option value="requested">requested</option>
                <option value="approved">approved</option>
                <option value="scheduled">scheduled</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Drive date</label>
              <input className="form-input" type="date" value={form.driveDate} onChange={onChange('driveDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={onChange('venue')} />
            </div>
            <div className="form-group">
              <label className="form-label">Max students</label>
              <input className="form-input" type="number" value={form.maxStudents} onChange={onChange('maxStudents')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Employer (optional)</label>
              <select className="form-select" value={form.employerId} onChange={onChange('employerId')} disabled={isLoading}>
                <option value="">No employer selected</option>
                {employers.map((e) => (
                  <option key={e.id} value={e.id}>{e.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Placement Drive' : 'Update Placement Drive'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          </form>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Existing Placement Drives</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.drive_date ? String(row.drive_date).slice(0, 10) : '-'}</td>
                    <td>{row.venue || '-'}</td>
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
                  <tr><td colSpan={5} className="text-secondary">No placement drives found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {viewRow ? (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">Placement Drive Details</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="text-sm">
              <div><strong>Title:</strong> {viewRow.title}</div>
              <div><strong>Description:</strong> {viewRow.description || '-'}</div>
              <div><strong>Status:</strong> {viewRow.status}</div>
              <div><strong>Date:</strong> {viewRow.drive_date ? String(viewRow.drive_date).slice(0, 10) : '-'}</div>
              <div><strong>Venue:</strong> {viewRow.venue || '-'}</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--danger-300)' }}>{error}</div> : null}
        {success ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--success-300)' }}>{success}</div> : null}
      </div>
    </div>
  );
}
