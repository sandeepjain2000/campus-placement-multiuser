'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertCircle,
  Building2,
  ExternalLink,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import DataTableToolbar from '@/components/DataTableToolbar';
import EmployerCompanyCell from '@/components/employer/EmployerCompanyCell';
import PageLoading from '@/components/PageLoading';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import {
  TIE_UP_REVOKE_DISABLED_TITLE,
  TIE_UP_REVOKE_ENABLED,
  TIE_UP_REVOKE_MESSAGES,
} from '@/lib/employerTieUpShared';
import { labelEmployerCompanyType } from '@/lib/employerCompanyTypeLabels';
import { COMMON_SORT_OPTIONS, EMPLOYER_STATUS_FILTER_OPTIONS, employerStatusFilterFn } from '@/lib/tableQueryPresets';
import { formatStatus } from '@/lib/utils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load');
  if (json?.employers && Array.isArray(json.employers)) return json;
  if (Array.isArray(json)) return { employers: json, staffDirectory: [] };
  throw new Error(json.error || 'Invalid response');
};

const STATUS_TONE = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  revoked: 'gray',
};

function EmployerStatus({ status }) {
  return (
    <StatusBadge tone={STATUS_TONE[status] || 'gray'} showDot>
      {formatStatus(status) || 'Unknown'}
    </StatusBadge>
  );
}

export default function CollegeEmployersContent() {
  const { data, error, isLoading, mutate } = useSWR('/api/college/employers', fetcher);
  const { addToast } = useToast();
  const [processingId, setProcessingId] = useState(null);
  const [pocModal, setPocModal] = useState(null);
  const [pocStaffSelection, setPocStaffSelection] = useState([]);
  const [pocSaving, setPocSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const list = data?.employers || [];
  const staffDirectory = data?.staffDirectory || [];
  const pendingCount = list.filter((employer) => employer.status === 'pending').length;

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayList,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(list, {
    getSearchText: (employer) =>
      [employer.name, employer.industry, employer.status, employer.email, labelEmployerCompanyType(employer.company_type)]
        .filter(Boolean)
        .join(' '),
    filterFn: employerStatusFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
  });

  useEffect(() => {
    const ids = pocModal?.coordination_poc_user_ids;
    setPocStaffSelection(Array.isArray(ids) ? ids.map(String) : []);
  }, [pocModal]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const employerId = revokeTarget.id;
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, confirmed: true, reason: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to revoke tie-up.');
      await mutate();
      addToast(json.message || 'Tie-up revoked. The employer has been notified.', 'success');
      setRevokeTarget(null);
    } catch (requestError) {
      addToast(requestError.message || 'Network error while revoking tie-up.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReinstate = async (employerId) => {
    setProcessingId(employerId);
    try {
      const res = await fetch('/api/college/employers/reinstate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to restore tie-up.');
      await mutate();
      addToast(json.message || 'Tie-up restored.', 'success');
    } catch (requestError) {
      addToast(requestError.message || 'Network error while restoring tie-up.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const savePocs = async () => {
    if (!pocModal) return;
    setPocSaving(true);
    try {
      const res = await fetch(`/api/college/employers/${pocModal.employer_id}/poc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffUserIds: pocStaffSelection }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save POC assignment.');
      await mutate();
      addToast('Campus POCs saved.', 'success');
      setPocModal(null);
    } catch (requestError) {
      addToast(requestError.message || 'Network error while saving.', 'error');
    } finally {
      setPocSaving(false);
    }
  };

  const actionsFor = (employer, showLabels = false) => (
    <div className="flex flex-wrap justify-end gap-2">
      {employer.website ? (
        <Button
          size={showLabels ? 'sm' : 'icon-sm'}
          variant="outline"
          render={
            <a
              href={employer.website.startsWith('http') ? employer.website : `https://${employer.website}`}
              target="_blank"
              rel="noreferrer"
            />
          }
          title="Visit website"
          aria-label="Visit website"
        >
          <ExternalLink data-icon="inline-start" />
          {showLabels ? 'Website' : null}
        </Button>
      ) : null}
      {employer.status === 'pending' ? (
        <Button
          size="sm"
          render={<Link href="/dashboard/college/employers/requests" />}
          aria-label={`Review ${employer.name || 'employer'} request`}
        >
          Review
        </Button>
      ) : null}
      {employer.status === 'approved' ? (
        <>
          <StandardTableIconAction
            action="pocs"
            variant="ghost"
            showLabel={showLabels}
            onClick={() => setPocModal(employer)}
          />
          <StandardTableIconAction
            action="delete"
            variant="danger"
            showLabel={showLabels}
            disabled={!TIE_UP_REVOKE_ENABLED || processingId === employer.employer_id}
            loading={processingId === employer.employer_id}
            onClick={() =>
              TIE_UP_REVOKE_ENABLED && setRevokeTarget({ id: employer.employer_id, name: employer.name })
            }
            tooltip={TIE_UP_REVOKE_ENABLED ? 'Revoke tie-up' : TIE_UP_REVOKE_DISABLED_TITLE}
          />
        </>
      ) : null}
      {employer.status === 'revoked' ? (
        <StandardTableIconAction
          action="restore"
          variant="ghost"
          showLabel={showLabels}
          loading={processingId === employer.employer_id}
          disabled={processingId === employer.employer_id}
          onClick={() => handleReinstate(employer.employer_id)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Building2 className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Employers
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Manage employer tie-ups, campus contacts, and access requests.
          </p>
        </div>
        {pendingCount > 0 ? (
          <Button size="sm" render={<Link href="/dashboard/college/employers/requests" />}>
            Review requests
          </Button>
        ) : null}
      </div>

      {!isLoading && !error ? (
        <Alert>
          <AlertCircle />
          <AlertTitle>
            {list.length} employer{list.length === 1 ? '' : 's'} with tie-up records
          </AlertTitle>
          <AlertDescription>
            {pendingCount ? `${pendingCount} awaiting approval` : 'No requests awaiting approval'}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not load employers</AlertTitle>
          <AlertDescription>
            {error.message || 'Confirm you are signed in as a college admin, then try again.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <PageLoading message="Loading employers…" inline /> : null}

      {!isLoading && !error && totalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <CardTitle>Employer tie-ups</CardTitle>
            <CardDescription>
              Showing {filteredCount} of {totalCount}
            </CardDescription>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search company, industry, or status…"
              filter={filter}
              onFilterChange={setFilter}
              filterOptions={EMPLOYER_STATUS_FILTER_OPTIONS}
              filterLabel="Status"
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
            <div className="hidden overflow-x-auto md:block">
              <Table className="employers-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Hires</TableHead>
                    <TableHead className="text-right">Drives</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="min-w-[7rem]">Status</TableHead>
                    <TableHead>POC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-muted-foreground h-24 text-center">
                        No employers match your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayList.map((employer, index) => {
                    const rating = employer.reliability_score != null ? Number(employer.reliability_score) : null;
                    const pocNames = (employer.coordination_poc_user_ids || [])
                      .map((id) => staffDirectory.find((staff) => String(staff.id) === String(id))?.name)
                      .filter(Boolean);
                    return (
                      <TableRow key={employer.approval_id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <EmployerCompanyCell name={employer.name} website={employer.website} email={employer.email} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{employer.industry || '—'}</TableCell>
                        <TableCell>
                          <StatusBadge tone="gray">{labelEmployerCompanyType(employer.company_type) || 'Unknown'}</StatusBadge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{employer.past_hires ?? 0}</TableCell>
                        <TableCell className="text-right font-medium">{employer.drives_count ?? 0}</TableCell>
                        <TableCell>
                          {rating != null && !Number.isNaN(rating) ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Star className="fill-amber-500 text-amber-500" /> {rating.toFixed(1)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="min-w-[7rem]" data-label="Status">
                          <EmployerStatus status={employer.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-40">
                          {pocNames.length ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Users /> {pocNames.join(', ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">{actionsFor(employer)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {displayList.length === 0 ? (
                <p className="text-muted-foreground m-0 text-sm">No employers match your search or filters.</p>
              ) : null}
              {displayList.map((employer) => {
                const rating = employer.reliability_score != null ? Number(employer.reliability_score) : null;
                const pocNames = (employer.coordination_poc_user_ids || [])
                  .map((id) => staffDirectory.find((staff) => String(staff.id) === String(id))?.name)
                  .filter(Boolean);
                return (
                  <Card key={employer.approval_id} size="sm" className="gap-3">
                    <CardHeader className="gap-2 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <EmployerCompanyCell name={employer.name} website={employer.website} email={employer.email} />
                        <EmployerStatus status={employer.status} />
                      </div>
                      <CardDescription>{employer.industry || 'Industry not provided'}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 px-4 text-sm">
                      <div><span className="text-muted-foreground block">Type</span>{labelEmployerCompanyType(employer.company_type)}</div>
                      <div><span className="text-muted-foreground block">Rating</span>{rating && !Number.isNaN(rating) ? rating.toFixed(1) : '—'}</div>
                      <div><span className="text-muted-foreground block">Hires</span>{employer.past_hires ?? 0}</div>
                      <div><span className="text-muted-foreground block">Drives</span>{employer.drives_count ?? 0}</div>
                      {pocNames.length ? (
                        <div className="col-span-2"><span className="text-muted-foreground block">Campus POCs</span>{pocNames.join(', ')}</div>
                      ) : null}
                    </CardContent>
                    <CardFooter className="justify-end border-t px-4">{actionsFor(employer, true)}</CardFooter>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && totalCount === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
              <Building2 className="size-7" />
            </div>
            <CardTitle>No employer tie-ups yet</CardTitle>
            <CardDescription>
              When an employer requests access to your campus, the request appears here.
            </CardDescription>
            <Button variant="outline" render={<Link href="/dashboard/college/employers/requests" />}>
              Review pending requests
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(pocModal)} onOpenChange={(open) => !open && !pocSaving && setPocModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign campus POCs</DialogTitle>
            <DialogDescription>
              Select the college staff coordinating with <strong>{pocModal?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="employer-poc-staff">College staff</FieldLabel>
            {staffDirectory.length ? (
              <select
                id="employer-poc-staff"
                multiple
                className="border-input bg-background min-h-36 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
                value={pocStaffSelection}
                onChange={(event) =>
                  setPocStaffSelection(Array.from(event.target.selectedOptions).map((option) => option.value))
                }
              >
                {staffDirectory.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} — {staff.role}
                  </option>
                ))}
              </select>
            ) : (
              <Alert>
                <AlertTitle>No placement coordinators found</AlertTitle>
                <AlertDescription>Add college admin accounts for your team first.</AlertDescription>
              </Alert>
            )}
            <FieldDescription>Hold Ctrl or Cmd to select multiple staff members.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPocModal(null)} disabled={pocSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={savePocs} disabled={pocSaving || staffDirectory.length === 0}>
              <Shield data-icon="inline-start" />
              {pocSaving ? 'Saving…' : 'Save POCs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && !processingId && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{TIE_UP_REVOKE_MESSAGES.collegeConfirmTitle}</DialogTitle>
            <DialogDescription>
              {revokeTarget ? TIE_UP_REVOKE_MESSAGES.collegeConfirmBody(revokeTarget.name) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeTarget(null)} disabled={Boolean(processingId)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleRevoke} disabled={Boolean(processingId)}>
              {processingId ? 'Revoking…' : 'Revoke tie-up & notify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
