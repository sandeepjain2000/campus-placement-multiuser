'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Building2, Inbox } from 'lucide-react';
import CompanyNameLink from '@/components/CompanyNameLink';
import DataTableToolbar from '@/components/DataTableToolbar';
import EntityLogo from '@/components/EntityLogo';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { toCompanyWebsiteUrl } from '@/lib/companyWebsite';
import { fetchJson, swrFetcher } from '@/lib/fetchJson';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { formatDate } from '@/lib/utils';

async function collegeRequestsFetcher(url) {
  const data = await swrFetcher(url);
  if (!Array.isArray(data)) throw new Error(data?.error || 'Invalid response');
  return data;
}

export default function EmployerRequestsPage() {
  const { addToast } = useToast();
  const { data: requests, error, isLoading, mutate } = useSWR(
    '/api/college/employers/requests',
    collegeRequestsFetcher
  );
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
    getSearchText: (request) => [request.company_name, request.industry, request.website].filter(Boolean).join(' '),
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
      await mutate();
      addToast(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success');
    } catch (requestError) {
      addToast(requestError instanceof Error ? requestError.message : 'Failed to process request.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Building2 className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Employer requests
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Review employer-initiated campus tie-up requests and approve or reject access.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load employer requests</AlertTitle>
          <AlertDescription>{error.message || 'Confirm your college admin session and try again.'}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <PageLoading message="Loading employer requests…" inline /> : null}

      {!isLoading && !error && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Pending requests</CardTitle>
                <CardDescription>
                  Showing {filteredCount} of {totalCount}
                </CardDescription>
              </div>
              <StatusBadge tone="amber" showDot>
                {totalCount} pending
              </StatusBadge>
            </div>
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
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="employer-requests-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Requested on</TableHead>
                    <TableHead className="min-w-[7rem]">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                        No requests match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayRequests.map((request, index) => (
                    <TableRow key={request.approval_id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EntityLogo name={request.company_name} website={request.website} size="sm" shape="rounded" />
                          <CompanyNameLink name={request.company_name} website={request.website} className="font-semibold" />
                        </div>
                      </TableCell>
                      <TableCell>{request.industry || '—'}</TableCell>
                      <TableCell>
                        {request.website ? (
                          <a
                            href={toCompanyWebsiteUrl(request.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {request.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(request.created_at)}</TableCell>
                      <TableCell className="min-w-[7rem]" data-label="Status">
                        <StatusBadge tone="amber" showDot>Pending</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <StandardTableIconAction
                            action="approve"
                            variant="success"
                            loading={processing === request.approval_id}
                            disabled={processing === request.approval_id}
                            onClick={() => handleAction(request.approval_id, 'approve')}
                            tooltip={`Approve ${request.company_name || 'employer'} request`}
                          />
                          <StandardTableIconAction
                            action="reject"
                            variant="danger"
                            loading={processing === request.approval_id}
                            disabled={processing === request.approval_id}
                            onClick={() => handleAction(request.approval_id, 'reject')}
                            tooltip={`Reject ${request.company_name || 'employer'} request`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="border-border justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-sm">
              Showing 1-{requestList.length} of {requestList.length}
            </span>
            <div className="flex gap-1" aria-label="Pagination">
              <Button size="icon-sm" variant="outline" disabled aria-label="Previous page">‹</Button>
              <Button
                size="icon-sm"
                variant="secondary"
                aria-label="Page 1"
                aria-current="page"
                onClick={() => addToast('Pagination is not available yet in this build.', 'info')}
              >
                1
              </Button>
              <Button size="icon-sm" variant="outline" disabled aria-label="Next page">›</Button>
            </div>
          </CardFooter>
        </Card>
      ) : null}

      {!isLoading && !error && totalCount === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
              <Inbox className="size-7" />
            </div>
            <CardTitle>No pending employer requests</CardTitle>
            <CardDescription>New campus tie-up requests will appear here for review.</CardDescription>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
