'use client';
import { useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { formatDate } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import { toCompanyWebsiteUrl } from '@/lib/companyWebsite';
import { useToast } from '@/components/ToastProvider';
import { fetchJson, swrFetcher } from '@/lib/fetchJson';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

async function collegeRequestsFetcher(url) {
  const data = await swrFetcher(url);
  if (!Array.isArray(data)) {
    throw new Error(data?.error || 'Invalid response');
  }
  return data;
}

export default function EmployerRequestsPage() {
  const { addToast } = useToast();
  const { data: requests, error, isLoading, mutate } = useSWR('/api/college/employers/requests', collegeRequestsFetcher);
  const requestList = Array.isArray(requests) ? requests : [];
  const [processing, setProcessing] = useState(null);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRequests,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(requestList, {
    getSearchText: (r) => [r.company_name, r.industry, r.website].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const handleAction = async (approvalId, action) => {
    if (action !== 'approve' && action !== 'reject') {
      addToast('Invalid action.', 'error');
      return;
    }
    setProcessing(approvalId);
    try {
      await fetchJson('/api/college/employers/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, action }),
      });
      mutate();
      addToast(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to process request.', 'error');
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

      {totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search company or industry…"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

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
              {displayRequests.length === 0 && totalCount > 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-secondary">
                    No requests match your search.
                  </td>
                </tr>
              ) : null}
              {totalCount > 0 ? (
                displayRequests.map((req, index) => (
                  <tr key={req.approval_id}>
                    <td style={{ color: 'var(--text-tertiary)' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EntityLogo name={req.company_name} website={req.website} size="sm" shape="rounded" />
                        <CompanyNameLink name={req.company_name} website={req.website} className="font-semibold" />
                      </div>
                    </td>
                    <td>{req.industry || '—'}</td>
                    <td>
                      {req.website ? (
                        <a href={toCompanyWebsiteUrl(req.website)} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary">
                          {req.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td>{formatDate(req.created_at)}</td>
                    <td>
                      <div className="table-actions" style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <StandardTableIconAction
                          action="approve"
                          variant="success"
                          loading={processing === req.approval_id}
                          disabled={processing === req.approval_id}
                          onClick={() => handleAction(req.approval_id, 'approve')}
                        />
                        <StandardTableIconAction
                          action="reject"
                          variant="danger"
                          loading={processing === req.approval_id}
                          disabled={processing === req.approval_id}
                          onClick={() => handleAction(req.approval_id, 'reject')}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : totalCount === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    No pending employer requests at the moment.
                  </td>
                </tr>
              ) : null}
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
