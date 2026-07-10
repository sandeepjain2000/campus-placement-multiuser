'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Search, Building2, CheckCircle2, Clock, Info } from 'lucide-react';
import EntityLogo from '@/components/EntityLogo';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to load (${res.status})`);
  if (!data.colleges || !Array.isArray(data.colleges)) {
    throw new Error(data.error || 'Invalid response from server');
  }
  return data;
};

function normalizeApprovalStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['approved', 'pending', 'rejected', 'blacklisted'].includes(s)) return s;
  return null;
}

function canRequestTieUp(status) {
  const s = normalizeApprovalStatus(status);
  return s === null || s === 'rejected' || s === 'blacklisted';
}

export default function CreateTieupPage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/employer/campuses', fetcher);

  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('available');
  const [requesting, setRequesting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const colleges = data?.colleges ?? [];
  const campusOptions = useMemo(
    () => [...colleges].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [colleges],
  );
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campusOptions.filter((c) => {
      const status = normalizeApprovalStatus(c.approval_status);
      const matchesSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && canRequestTieUp(c.approval_status)) ||
        (statusFilter === 'approved' && status === 'approved') ||
        (statusFilter === 'pending' && status === 'pending') ||
        (statusFilter === 'rejected' && (status === 'rejected' || status === 'blacklisted'));
      return matchesSearch && matchesStatus;
    });
  }, [campusOptions, search, statusFilter]);

  const selectedCollege = useMemo(
    () => (selectedCollegeId ? colleges.find((c) => c.id === selectedCollegeId) : null),
    [colleges, selectedCollegeId],
  );

  const approvedCount = colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'approved').length;
  const pendingCount = colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'pending').length;
  const availableCount = colleges.filter(c => canRequestTieUp(c.approval_status)).length;

  const handleRequestAccess = async () => {
    if (!selectedCollege) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/employer/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeId: selectedCollege.id }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.alreadyPending) {
          showToast(json.message || 'Already pending', 'error');
        } else {
          showToast(json.message || `Tie-up requested for ${selectedCollege.name}`);
          setTimeout(() => router.push('/dashboard/employer/select-campus'), 1500);
        }
      } else {
        showToast(json.error || 'Request failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Toast */}
      {toast && (
        <div className="animate-slideUp" style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.95rem',
          background: toast.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
          border: `1px solid ${toast.type === 'error' ? 'var(--danger-200)' : 'var(--success-200)'}`,
          color: toast.type === 'error' ? 'var(--danger-700)' : 'var(--success-700)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <button
        onClick={() => router.push('/dashboard/employer/select-campus')}
        className="btn btn-ghost"
        style={{ marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', paddingLeft: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Directory
      </button>

      {/* High-Fidelity Glassmorphic Hero Banner */}
      <div 
        style={{
          position: 'relative',
          background: 'var(--banner-gradient)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          color: 'white',
          overflow: 'hidden',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Decorative Elements */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={28} /> Create Tie-up Request
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
            Choose a college and send a partnership request. The college admin will review your request.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {!isLoading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--success-200)', background: 'linear-gradient(135deg, white, var(--success-50))' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--success-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--success-600)' }}>
              <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-800)', lineHeight: 1 }}>{approvedCount}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--success-700)', marginTop: '0.2rem', fontWeight: 600 }}>Approved Tie-ups</div>
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--warning-200)', background: 'linear-gradient(135deg, white, var(--warning-50))' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--warning-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--warning-600)' }}>
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning-800)', lineHeight: 1 }}>{pendingCount}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--warning-700)', marginTop: '0.2rem', fontWeight: 600 }}>Pending Requests</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--primary-200)', background: 'linear-gradient(135deg, var(--bg-primary), var(--primary-50))' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary-600)' }}>
              <Building2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{availableCount}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary-700)', marginTop: '0.2rem', fontWeight: 600 }}>Available Colleges</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

        {/* Left: Form */}
        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-default)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Select a College
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 2rem' }}>
            Filter colleges by status and search by name/city. Select an available college from the list to request access.
          </p>

          {isLoading && (
            <div>
              <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
              <div className="skeleton skeleton-card" style={{ height: 300 }} />
            </div>
          )}
          
          {error && (
            <div style={{ padding: '1.5rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: 'var(--radius-md)', color: 'var(--danger-700)', fontSize: '0.95rem', fontWeight: 500 }}>
              {error.message || 'Failed to load colleges. Please refresh and try again.'}
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 300px' }}>
                  <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search college name or city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '2.75rem', paddingRight: '1rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', fontSize: '0.95rem' }}
                  />
                </div>
                
                <select className="form-select" style={{ width: 'auto', padding: '0.65rem 2rem 0.65rem 1rem', fontSize: '0.95rem', fontWeight: 500 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="available">{formatFilterBadgeLabelParen('Available', availableCount)}</option>
                  <option value="approved">{formatFilterBadgeLabelParen('Approved', approvedCount)}</option>
                  <option value="pending">{formatFilterBadgeLabelParen('Pending', pendingCount)}</option>
                  <option value="rejected">Rejected/Blacklisted</option>
                  <option value="all">All Colleges ({colleges.length})</option>
                </select>
              </div>

              <div className="table-container" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ width: 48, paddingLeft: '1.5rem', textAlign: 'center' }}>Select</th>
                      <th>College</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '3rem 1.5rem' }}>
                          <Building2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>No colleges match your filter</div>
                        </td>
                      </tr>
                    ) : (
                      filteredOptions.map((c) => {
                        const isSelected = selectedCollegeId === c.id;
                        const status = normalizeApprovalStatus(c.approval_status);
                        const selectable = canRequestTieUp(c.approval_status);
                        return (
                          <tr
                            key={c.id}
                            onClick={() => selectable && setSelectedCollegeId(c.id)}
                            style={{ 
                              opacity: selectable ? 1 : 0.65, 
                              cursor: selectable ? 'pointer' : 'not-allowed',
                              background: isSelected ? 'var(--primary-50)' : 'transparent',
                              transition: 'all 0.15s'
                            }}
                          >
                            <td style={{ paddingLeft: '1.5rem', textAlign: 'center' }}>
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => selectable && setSelectedCollegeId(c.id)}
                                disabled={!selectable}
                                aria-label={`Select ${c.name}`}
                                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary-600)', cursor: selectable ? 'pointer' : 'not-allowed' }}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <EntityLogo name={c.name} website={c.website} size="sm" shape="rounded" />
                                <div style={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--primary-900)' : 'var(--text-primary)' }}>{c.name}</div>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{c.city || '—'}</td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                background: status === 'approved' ? 'var(--success-50)' : status === 'pending' ? 'var(--warning-50)' : status === 'blacklisted' ? 'var(--danger-50)' : 'var(--primary-50)',
                                color: status === 'approved' ? 'var(--success-700)' : status === 'pending' ? 'var(--warning-700)' : status === 'blacklisted' ? 'var(--danger-700)' : 'var(--primary-700)',
                              }}>
                                {status ? (status === 'blacklisted' ? 'Blacklisted' : status[0].toUpperCase() + status.slice(1)) : 'Available'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {selectedCollege && (
                <div className="animate-slideUp" style={{
                  marginTop: '1rem', padding: '1.25rem 1.5rem',
                  background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
                  borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)'
                }}>
                  <div style={{ padding: '0.75rem', background: 'var(--primary-100)', borderRadius: '12px', color: 'var(--primary-600)' }}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-900)', marginBottom: '0.2rem' }}>{selectedCollege.name}</div>
                    {selectedCollege.city && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--primary-700)', fontWeight: 500 }}>{selectedCollege.city}</div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-default)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => router.push('/dashboard/employer/select-campus')}
                  style={{ fontWeight: 600, padding: '0.75rem 1.5rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selectedCollege || !canRequestTieUp(selectedCollege.approval_status) || requesting}
                  onClick={handleRequestAccess}
                  style={{ minWidth: '200px', fontWeight: 600, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {requesting ? 'Sending Request...' : <>Send Tie-up Request <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /></>}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Help Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.4rem', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: '8px' }}>
                <Info size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>How it works</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { step: '1', text: 'Search and select an available college.' },
                { step: '2', text: 'Click "Send Tie-up Request".' },
                { step: '3', text: 'The college admin reviews your request.' },
                { step: '4', text: 'Once approved, you can schedule placement drives.' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: '0.1rem' }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, white, var(--warning-50))', border: '1px solid var(--warning-200)' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--warning-900)' }}>
              ⚠️ Important Note
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--warning-800)', lineHeight: 1.5 }}>
              Colleges marked as <strong>Approved</strong> or <strong>Pending</strong> cannot be re-requested. Only colleges showing <strong>Available</strong> can receive a new tie-up request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
