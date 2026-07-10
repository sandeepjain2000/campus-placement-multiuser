'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (!Array.isArray(data)) throw new Error(data.error || 'Invalid response');
  return data;
};

function formatCompanyType(companyType) {
  if (!companyType) return '—';
  const labels = {
    mnc: 'MNC',
    startup: 'Startup',
    psu: 'PSU',
    private: 'Private',
    government: 'Government',
    ngo: 'NGO',
    other: 'Other',
  };
  return labels[companyType] || formatStatus(companyType);
}

export default function CollegeEmployersPage() {
  const { data: employers, error, isLoading, mutate } = useSWR('/api/college/employers', fetcher);
  const [processingId, setProcessingId] = useState(null);
  const [pocModal, setPocModal] = useState(null);
  const { addToast } = useToast();

  const list = employers || [];

  const handleRevoke = async (employerId) => {
    if (!confirm('Block this employer? They will no longer have campus access.')) return;

    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId }),
      });
      const data = await res.json();

      if (res.ok) {
        await mutate();
        addToast('Employer access blocked.', 'success');
      } else {
        addToast(data.error || 'Failed to block employer.', 'error');
      }
    } catch {
      addToast('Network error while blocking access.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="skeleton skeleton-card" style={{ height: 280, margin: '2rem' }} />;
  }

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load employers.'}</p>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          Check database connectivity and that you are signed in as a college admin.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🏢 Manage Employers</h1>
          <p>
            Employers appear here after they request a tie-up.{' '}
            <Link href="/dashboard/college/employers/requests" className="text-primary" style={{ fontWeight: 600 }}>
              Review pending requests →
            </Link>
          </p>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Sr No.</th>
              <th>Company</th>
              <th>Industry</th>
              <th>Type</th>
              <th>Past hires</th>
              <th>Drives</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                  <div style={{ color: 'var(--text-secondary)' }}>No employer tie-ups yet.</div>
                  <div className="text-sm text-tertiary" style={{ marginTop: '0.5rem' }}>
                    When an employer requests access to your campus, they will show up here and under Pending Requests.
                  </div>
                </td>
              </tr>
            ) : (
              list.map((emp, index) => {
                const rating = emp.reliability_score != null ? Number(emp.reliability_score) : null;
                const stars = rating != null && !Number.isNaN(rating) ? Math.min(5, Math.max(0, Math.round(rating))) : 0;
                return (
                  <tr key={emp.approval_id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EntityLogo name={emp.name} website={emp.website} size="sm" shape="rounded" />
                        <span className="font-semibold">{emp.name}</span>
                      </div>
                    </td>
                    <td>{emp.industry || '—'}</td>
                    <td>
                      <span className="badge badge-gray">{formatCompanyType(emp.company_type)}</span>
                    </td>
                    <td>{emp.past_hires ?? 0}</td>
                    <td>{emp.drives_count ?? 0}</td>
                    <td>
                      {stars > 0 ? (
                        <>
                          {'⭐'.repeat(stars)}{' '}
                          <span className="text-sm text-tertiary">{rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-tertiary">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(emp.status)} badge-dot`}>{formatStatus(emp.status)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {emp.website ? (
                          <a
                            href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                          >
                            Website
                          </a>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" disabled title="No website on file">
                            Website
                          </button>
                        )}
                        {emp.status === 'pending' && (
                          <Link href="/dashboard/college/employers/requests" className="btn btn-success btn-sm">
                            Review
                          </Link>
                        )}
                        {emp.status === 'approved' && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPocModal(emp)}>
                            POCs
                          </button>
                        )}
                        {emp.status === 'approved' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger-500)' }}
                            onClick={() => handleRevoke(emp.employer_id)}
                            disabled={processingId === emp.employer_id}
                          >
                            {processingId === emp.employer_id ? 'Blocking...' : 'Block'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {list.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {list.length} employer{list.length !== 1 ? 's' : ''} with a tie-up record
            </div>
          </div>
        )}
      </div>

      {pocModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card animate-fadeIn" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Nominate coordination POCs
            </h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1.5rem' }}>
              Assign college staff to coordinate with <strong>{pocModal.name}</strong>. (Wireframe — not saved yet.)
            </p>

            <div className="form-group">
              <label className="form-label">College staff nominees</label>
              <select className="form-select" multiple style={{ height: '80px' }}>
                <option value="s1">Dr. Sharma (Computer Science)</option>
                <option value="s2">Prof. Reddy (Electronics)</option>
                <option value="s3">Ms. Iyer (Placement Officer)</option>
              </select>
              <p className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Hold Ctrl/Cmd to select multiple staff.
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Placement committee student nominees</label>
              <select className="form-select" multiple style={{ height: '80px' }}>
                <option value="c1">Rohan Patel (CSE Year 4)</option>
                <option value="c2">Amit Kumar (ME Year 4)</option>
                <option value="c3">Sneha Iyer (IT Year 3)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPocModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addToast('POCs assignment is not available yet in this build.', 'info');
                  setPocModal(null);
                }}
              >
                Save nominations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
