'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DataEntryStudentProfilesPage() {
  const [studentUsers, setStudentUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    id: '',
    userId: '',
    department: '',
    cgpa: '7.50',
    placementStatus: 'unplaced',
    batchYear: '',
    graduationYear: '',
    isVerified: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [optionsRes, profilesRes] = await Promise.all([
        fetch('/api/data-entry/options'),
        fetch('/api/data-entry/student-profiles'),
      ]);
      const optionsJson = await optionsRes.json();
      const profilesJson = await profilesRes.json();
      if (!optionsRes.ok) throw new Error(optionsJson?.error || 'Failed to load options');
      if (!profilesRes.ok) throw new Error(profilesJson?.error || 'Failed to load student profiles');
      const studentsOnly = optionsJson.studentUsers || [];
      const allUsers = optionsJson.tenantUsers || [];
      setStudentUsers(studentsOnly.length > 0 ? studentsOnly : allUsers);
      setRows(profilesJson.studentProfiles || []);
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
    const value = field === 'isVerified' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      userId: '',
      department: '',
      cgpa: '7.50',
      placementStatus: 'unplaced',
      batchYear: '',
      graduationYear: '',
      isVerified: false,
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      userId: row.user_id,
      department: row.department || '',
      cgpa: String(row.cgpa ?? ''),
      placementStatus: row.placement_status || 'unplaced',
      batchYear: String(row.batch_year ?? ''),
      graduationYear: String(row.graduation_year ?? ''),
      isVerified: !!row.is_verified,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const method = mode === 'add' ? 'POST' : 'PUT';
      const payload =
        mode === 'add'
          ? form
          : {
              id: form.id,
              department: form.department,
              cgpa: form.cgpa,
              placementStatus: form.placementStatus,
              batchYear: form.batchYear,
              graduationYear: form.graduationYear,
              isVerified: form.isVerified,
            };
      const res = await fetch('/api/data-entry/student-profiles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save student profile');
      setSuccess(mode === 'add' ? 'Student profile created' : 'Student profile updated');
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student profile?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/student-profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete student profile');
      setSuccess('Student profile deleted');
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
            <h1>Data Entry • Student Profiles</h1>
            <p>Create profile rows linked to student users.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Profile</button>
            <button type="button" className="btn btn-secondary" onClick={loadData}>Refresh</button>
            <Link href="/data-entry" className="btn btn-secondary">Back to list</Link>
          </div>
        </div>

        {showForm && (
          <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">{mode === 'add' ? 'Add Student Profile' : 'Edit Student Profile'}</h3>
            </div>
            <div className="grid grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Student user</label>
                <select className="form-select" value={form.userId} onChange={onChange('userId')} required disabled={isLoading || mode === 'edit'}>
                  <option value="">Select a student user</option>
                  {studentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name || ''} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={onChange('department')} required />
              </div>
              <div className="form-group">
                <label className="form-label">CGPA</label>
                <input className="form-input" type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={onChange('cgpa')} />
              </div>
              <div className="form-group">
                <label className="form-label">Placement status</label>
                <select className="form-select" value={form.placementStatus} onChange={onChange('placementStatus')}>
                  <option value="unplaced">unplaced</option>
                  <option value="placed">placed</option>
                  <option value="opted_out">opted_out</option>
                  <option value="higher_studies">higher_studies</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Batch year</label>
                <input className="form-input" type="number" value={form.batchYear} onChange={onChange('batchYear')} />
              </div>
              <div className="form-group">
                <label className="form-label">Graduation year</label>
                <input className="form-input" type="number" value={form.graduationYear} onChange={onChange('graduationYear')} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
                <input id="profile-verified" type="checkbox" checked={form.isVerified} onChange={onChange('isVerified')} />
                <label htmlFor="profile-verified" className="form-label" style={{ margin: 0 }}>Mark verified</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Student Profile' : 'Update Student Profile'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Existing Student Profiles</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>CGPA</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.first_name} {row.last_name || ''} ({row.email || '-'})</td>
                    <td>{row.department || '-'}</td>
                    <td>{row.cgpa ?? '-'}</td>
                    <td>{row.placement_status || '-'}</td>
                    <td>{row.is_verified ? 'Yes' : 'No'}</td>
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
                  <tr>
                    <td colSpan={6} className="text-secondary">No student profiles found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {viewRow ? (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">Student Profile Details</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="text-sm">
              <div><strong>Student:</strong> {viewRow.first_name} {viewRow.last_name || ''}</div>
              <div><strong>Email:</strong> {viewRow.email || '-'}</div>
              <div><strong>Department:</strong> {viewRow.department || '-'}</div>
              <div><strong>CGPA:</strong> {viewRow.cgpa ?? '-'}</div>
              <div><strong>Status:</strong> {viewRow.placement_status || '-'}</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--danger-300)' }}>{error}</div> : null}
        {success ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--success-300)' }}>{success}</div> : null}
      </div>
    </div>
  );
}
