'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { formatDate } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  if (!Array.isArray(data)) throw new Error(data.error || 'Invalid response');
  return data;
};

export default function EmployerRequestsPage() {
  const { addToast } = useToast();
  const { data: requests, error, isLoading, mutate } = useSWR('/api/college/employers/requests', fetcher);
  const [processing, setProcessing] = useState(null);

  const handleAction = async (approvalId, action) => {
    setProcessing(approvalId);
    try {
      const res = await fetch('/api/college/employers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, action })
      });
      if (res.ok) {
        mutate(); // Refresh the list
        addToast(`Request ${action}d successfully.`, 'success');
      } else {
        addToast('Failed to process request.', 'error');
      }
    } catch (e) {
      addToast('Network error while processing request.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) return <div className="skeleton skeleton-card" style={{ height: 200, margin: '2rem' }}></div>;

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load requests.'}</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>🏢 Employer Requests</h1>
          <p>Employers initiate tie-ups from their portal; you approve or reject here.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none', margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Sr No.</th>
                <th>Company</th>
                <th>Industry</th>
                <th>Website</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests && requests.length > 0 ? (
                requests.map((req, index) => (
                  <tr key={req.approval_id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EntityLogo name={req.company_name} website={req.website} size="sm" shape="rounded" />
                        <span className="font-semibold">{req.company_name}</span>
                      </div>
                    </td>
                    <td>{req.industry || 'N/A'}</td>
                    <td>
                      {req.website ? (
                        <a href={req.website} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary">
                          {req.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td>{formatDate(req.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-success btn-sm"
                          disabled={processing === req.approval_id}
                          onClick={() => handleAction(req.approval_id, 'approve')}
                        >
                          {processing === req.approval_id ? '...' : 'Approve'}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger-500)' }}
                          disabled={processing === req.approval_id}
                          onClick={() => handleAction(req.approval_id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    No pending employer requests at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {requests && requests.length > 0 && (
            <div className="table-pagination">
              <span>Showing 1-{requests.length} of {requests.length}</span>
              <div className="table-pagination-controls">
                <button className="pagination-btn" disabled>‹</button>
                <button className="pagination-btn active" onClick={() => addToast('Pagination is not available yet in this build.', 'info')}>1</button>
                <button className="pagination-btn" disabled>›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
