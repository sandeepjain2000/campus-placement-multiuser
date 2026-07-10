'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DataEntryUsersPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'student',
    isVerified: false,
    isActive: true,
  });
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [viewRow, setViewRow] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRows = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/data-entry/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load users');
      setRows(json.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const onChange = (field) => (event) => {
    const value = ['isVerified', 'isActive'].includes(field) ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAdd = () => {
    setMode('add');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'student',
      isVerified: false,
      isActive: true,
    });
  };

  const openEdit = (row) => {
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccess('');
    setForm({
      id: row.id,
      email: row.email,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      password: '',
      role: row.role,
      isVerified: !!row.is_verified,
      isActive: !!row.is_active,
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
              firstName: form.firstName,
              lastName: form.lastName,
              role: form.role,
              isVerified: form.isVerified,
              isActive: form.isActive,
            };
      const res = await fetch('/api/data-entry/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save user');
      setSuccess(mode === 'add' ? 'User created successfully' : 'User updated successfully');
      setShowForm(false);
      await loadRows();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/data-entry/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete user');
      setSuccess('User deleted successfully');
      await loadRows();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', padding: '2rem' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Data Entry • Users</h1>
            <p>Create base user records for your tenant.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add User</button>
            <button type="button" className="btn btn-secondary" onClick={loadRows}>Refresh</button>
            <Link href="/data-entry" className="btn btn-secondary">Back to list</Link>
          </div>
        </div>

        {showForm && (
          <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">{mode === 'add' ? 'Add User' : 'Edit User'}</h3>
            </div>
            <div className="grid grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={onChange('email')} required disabled={mode === 'edit'} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={onChange('role')}>
                  <option value="student">student</option>
                  <option value="college_admin">college_admin</option>
                  <option value="employer">employer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">First name</label>
                <input className="form-input" value={form.firstName} onChange={onChange('firstName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input className="form-input" value={form.lastName} onChange={onChange('lastName')} />
              </div>
              {mode === 'add' ? (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choose initial password"
                    value={form.password}
                    onChange={onChange('password')}
                    required
                  />
                </div>
              ) : <div />}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.8rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <input type="checkbox" checked={form.isVerified} onChange={onChange('isVerified')} /> Verified
                </label>
                <label className="form-label" style={{ margin: 0 }}>
                  <input type="checkbox" checked={form.isActive} onChange={onChange('isActive')} /> Active
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create User' : 'Update User'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Existing Users</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.email}</td>
                    <td>{row.first_name} {row.last_name || ''}</td>
                    <td>{row.role}</td>
                    <td>{row.is_verified ? 'Yes' : 'No'}</td>
                    <td>{row.is_active ? 'Yes' : 'No'}</td>
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
                    <td colSpan={6} className="text-secondary">No users found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {viewRow ? (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title">User Details</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
            <div className="text-sm">
              <div><strong>Email:</strong> {viewRow.email}</div>
              <div><strong>Name:</strong> {viewRow.first_name} {viewRow.last_name || ''}</div>
              <div><strong>Role:</strong> {viewRow.role}</div>
              <div><strong>Verified:</strong> {viewRow.is_verified ? 'Yes' : 'No'}</div>
              <div><strong>Active:</strong> {viewRow.is_active ? 'Yes' : 'No'}</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--danger-300)' }}>{error}</div> : null}
        {success ? <div className="card" style={{ marginTop: '1rem', borderColor: 'var(--success-300)' }}>{success}</div> : null}
      </div>
    </div>
  );
}
