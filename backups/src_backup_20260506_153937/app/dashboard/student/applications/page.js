'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import PageError from '@/components/PageError';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to load applications');
  }
  return res.json();
};

function roundLabel(item) {
  if (item.status === 'selected') return 'All rounds cleared';
  if (item.status === 'rejected') return 'Not qualified';
  if (Number(item.currentRound) > 0) return `Round ${item.currentRound}`;
  return 'Pending review';
}

export default function StudentApplicationsPage() {
  const { addToast } = useToast();
  const [filter, setFilter] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);
  const { data, error, isLoading, mutate } = useSWR('/api/student/applications', fetcher);
  const applications = data?.items || [];

  const handleWithdraw = async (applicationId) => {
    setWithdrawingId(applicationId);
    try {
      const res = await fetch('/api/student/applications/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to withdraw application');
      addToast('Application withdrawn successfully.', 'success');
      mutate();
    } catch (e) {
      addToast(e.message || 'Failed to withdraw application', 'error');
    } finally {
      setWithdrawingId(null);
    }
  };

  const filtered = useMemo(
    () => applications.filter((a) => !filter || a.status === filter),
    [applications, filter],
  );

  const statusCounts = {
    all: applications.length,
    applied: applications.filter((a) => a.status === 'applied').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    selected: applications.filter((a) => a.status === 'selected').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (error) return <PageError error={error} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📝 My Applications</h1>
          <p>Track the status of all your placement applications</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs">
        <button className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>All ({statusCounts.all})</button>
        <button className={`tab ${filter === 'applied' ? 'active' : ''}`} onClick={() => setFilter('applied')}>Applied ({statusCounts.applied})</button>
        <button className={`tab ${filter === 'shortlisted' ? 'active' : ''}`} onClick={() => setFilter('shortlisted')}>Shortlisted ({statusCounts.shortlisted})</button>
        <button className={`tab ${filter === 'selected' ? 'active' : ''}`} onClick={() => setFilter('selected')}>Selected ({statusCounts.selected})</button>
        <button className={`tab ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Rejected ({statusCounts.rejected})</button>
      </div>

      {/* Application Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading && (
          <div className="card">
            <div className="text-sm text-secondary">Loading applications…</div>
          </div>
        )}
        {filtered.map(app => (
          <div key={app.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <EntityLogo name={app.company} size="md" shape="rounded" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{app.company}</h3>
                    <span className={`badge badge-${getStatusColor(app.status)} badge-dot`}>{formatStatus(app.status)}</span>
                  </div>
                  <p className="text-sm text-secondary" style={{ marginTop: '0.125rem' }}>{app.role}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-xs text-tertiary">Applied on</div>
                <div className="text-sm font-semibold">{formatDate(app.appliedAt)}</div>
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
              <div className="text-xs font-semibold text-secondary" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current stage
              </div>
              <div className="text-sm" style={{ fontWeight: 600 }}>
                {roundLabel(app)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <span className="text-sm text-tertiary">Drive Date: {formatDate(app.driveDate)}</span>
              {app.status === 'applied' && (
                <button
                  className="btn btn-danger btn-sm"
                  disabled={withdrawingId === app.id}
                  onClick={() => handleWithdraw(app.id)}
                >
                  {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                </button>
              )}
              {app.status === 'selected' && (
                <span className="badge badge-green" style={{ padding: '0.375rem 1rem' }}>🎉 Offer Available</span>
              )}
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="card">
            <div className="text-sm text-secondary">No applications found for this filter.</div>
          </div>
        )}
      </div>
    </div>
  );
}
