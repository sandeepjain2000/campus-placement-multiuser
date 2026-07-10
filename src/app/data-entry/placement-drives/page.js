'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate, formatStatus } from '@/lib/utils';
import { CalendarDays, MapPin, Building2, Users, X, ArrowLeft } from 'lucide-react';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateDataEntryDrivePayload } from '@/lib/apiInputValidation';

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
  
  const [showFormModal, setShowFormModal] = useState(false);
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
    setShowFormModal(true);
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
    setShowFormModal(true);
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
    const driveErr = validateDataEntryDrivePayload({
      driveDate: form.driveDate,
      maxStudents: form.maxStudents,
    });
    if (driveErr) {
      setError(driveErr);
      return;
    }
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
      setShowFormModal(false);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this placement drive?')) return;
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

  const getEmployerName = (id) => {
    const emp = employers.find(e => e.id === id);
    return emp ? emp.company_name : 'No employer linked';
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return 'green';
    if (status === 'approved') return 'blue';
    if (status === 'cancelled') return 'danger';
    if (status === 'in_progress') return 'warning';
    return 'gray';
  };

  return (
    <div className="animate-fadeIn page-content">
      {/* Premium Header */}
      <div 
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--slate-800), var(--slate-600))',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ color: 'white' }}>
              <Link href="/data-entry" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <ArrowLeft size={16} /> Back to Data Entry
              </Link>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                Placement Drives
              </h1>
              <p style={{ fontSize: '1.05rem', opacity: 0.9, margin: 0, fontWeight: 500 }}>
                Manage master records for all campus placement drives.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn" onClick={loadData} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                Refresh Data
              </button>
              <StandardTableIconAction
                action="add"
                variant="secondary"
                onClick={openAdd}
                style={{
                  background: 'white',
                  color: 'var(--slate-800)',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--danger-500)', background: 'var(--danger-50)' }}><p style={{ color: 'var(--danger-700)', margin: 0, fontWeight: 500 }}>{error}</p></div> : null}
      {success ? <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--success-500)', background: 'var(--success-50)' }}><p style={{ color: 'var(--success-700)', margin: 0, fontWeight: 500 }}>{success}</p></div> : null}

      {/* Grid List View */}
      {isLoading ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--primary-100)', borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p className="text-secondary" style={{ marginTop: '1rem', fontWeight: 500 }}>Loading placement drives...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)' }}>
            <CalendarDays size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No drives recorded</h3>
            <p className="text-secondary" style={{ margin: 0 }}>Create your first placement drive to see it listed here.</p>
          </div>
          <StandardTableIconAction action="add" variant="primary" onClick={openAdd} style={{ marginTop: '0.5rem' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {rows.map((row) => (
            <div key={row.id} className="card card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, lineHeight: 1.3, color: 'var(--text-primary)' }}>
                  {row.title}
                </h3>
                <span className={`badge badge-${getStatusColor(row.status)}`} style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                  {formatStatus(row.status)}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} style={{ opacity: 0.7 }} />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getEmployerName(row.employer_id)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarDays size={16} style={{ opacity: 0.7 }} />
                  <span>{row.drive_date ? formatDate(row.drive_date) : 'No date set'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ opacity: 0.7 }} />
                  <span>{row.venue || 'Venue TBD'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
                <StandardTableIconAction action="view" onClick={() => setViewRow(row)} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <StandardTableIconAction action="edit" showLabel={false} onClick={() => openEdit(row)} />
                  <StandardTableIconAction action="delete" variant="danger" showLabel={false} onClick={() => handleDelete(row.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showFormModal && (
        <>
          <div className="modal-backdrop animate-fadeIn" onClick={() => setShowFormModal(false)} />
          <div className="modal modal-lg animate-slideUp">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">{mode === 'add' ? 'Create Placement Drive' : 'Edit Placement Drive'}</h3>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowFormModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="grid grid-2" style={{ gap: '1.25rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Drive Title <span className="text-danger-500">*</span></label>
                    <input className="form-input" value={form.title} onChange={onChange('title')} required placeholder="e.g. Google Campus Hiring 2026" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" rows={3} value={form.description} onChange={onChange('description')} placeholder="Provide details about the roles and process..." />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Employer / Company</label>
                    <select className="form-select" value={form.employerId} onChange={onChange('employerId')} disabled={isLoading}>
                      <option value="">-- No employer selected --</option>
                      {employers.map((e) => (
                        <option key={e.id} value={e.id}>{e.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={onChange('status')}>
                      <option value="requested">Requested</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Drive Date</label>
                    <ValidatedDateInput fieldId={FIELD_IDS.EMPLOYER_DRIVE_DATE} value={form.driveDate} onChange={(v) => setForm((p) => ({ ...p, driveDate: v }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue / Platform</label>
                    <input className="form-input" value={form.venue} onChange={onChange('venue')} placeholder="e.g. Main Auditorium or Virtual" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Students</label>
                    <ValidatedNumberInput fieldId={FIELD_IDS.DRIVE_MAX_STUDENTS} value={form.maxStudents} onChange={(v) => setForm((p) => ({ ...p, maxStudents: v }))} placeholder="e.g. 500" />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Drive' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* View Details Modal */}
      {viewRow && (
        <>
          <div className="modal-backdrop animate-fadeIn" onClick={() => setViewRow(null)} />
          <div className="modal animate-slideUp">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} className="text-primary-600" />
                Drive Details
              </h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setViewRow(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{viewRow.title}</h4>
                  <span className={`badge badge-${getStatusColor(viewRow.status)}`}>{formatStatus(viewRow.status)}</span>
                </div>
                
                <div style={{ display: 'grid', gap: '1rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-xs text-secondary text-uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Employer</span>
                    <span style={{ fontWeight: 500 }}>{getEmployerName(viewRow.employer_id)}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="text-xs text-secondary text-uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Date</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CalendarDays size={14} className="text-secondary" /> 
                        {viewRow.drive_date ? formatDate(viewRow.drive_date) : '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="text-xs text-secondary text-uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Venue</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} className="text-secondary" /> 
                        {viewRow.venue || '-'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-xs text-secondary text-uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Max Capacity</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={14} className="text-secondary" /> 
                      {viewRow.max_students ? `${viewRow.max_students} students` : 'Unlimited'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-secondary text-uppercase" style={{ fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Description</span>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-secondary)', background: 'var(--bg-inset)', padding: '1rem', borderRadius: 'var(--radius-md)', minHeight: '80px' }}>
                    {viewRow.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description provided.</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary w-full" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
