'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS, PENDING_ROLE_FILTER_OPTIONS, roleFilterFn } from '@/lib/tableQueryPresets';
import { useToast } from '@/components/ToastProvider';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPendingRegistrationsPage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pending-registrations');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setRows(Array.isArray(json.pending) ? json.pending : []);
    } catch (e) {
      addToast(e.message || 'Failed to load', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(rows, {
    getSearchText: (r) =>
      [r.label, r.firstName, r.lastName, r.email, r.role === 'college_admin' ? 'college' : 'employer']
        .filter(Boolean)
        .join(' '),
    filterFn: roleFilterFn,
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const act = async (userId, action, reason) => {
    setProcessing(userId + action);
    try {
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast(action === 'approve' ? 'Account approved.' : 'Registration rejected.', 'success');
      setRejectFor(null);
      setRejectNote('');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleResendVerification = async (userId) => {
    setProcessing(userId + 'resend');
    try {
      const res = await fetch('/api/admin/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'resend_verification' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to resend');
      addToast(json?.message || 'Verification email resent.', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to resend verification', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const getExportRows = (scope = 'current') => {
    const headers = ['Party', 'Contact Name', 'Email', 'Email verified', 'Role', 'Requested Date'];
    const source = scope === 'full' ? rows : displayRows;
    const rowsList = source.map((r) => [
      r.label,
      `${r.firstName} ${r.lastName}`,
      r.email,
      r.emailVerified ? 'Yes' : 'No',
      r.role === 'college_admin' ? 'College' : 'Employer',
      r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
    ]);
    return { headers, rows: rowsList };
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Onboard colleges & employers</h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">Approve pending sign-ups before they can sign in.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvSplitButton 
            filenameBase="admin_pending_registrations" 
            currentCount={displayRows.length}
            fullCount={rows.length}
            getRows={getExportRows} 
          />
          <Button size="sm" variant="outline" render={<Link href="/dashboard/admin/colleges/add" />}>Add college</Button>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/admin/colleges" />}>Colleges directory</Button>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/admin/employers" />}>Employers directory</Button>
        </div>
      </div>

      {!loading && totalCount > 0 ? (
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search party, contact, or email…"
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={PENDING_ROLE_FILTER_OPTIONS}
          filterLabel="Role"
          sort={sort}
          onSortChange={setSort}
          sortOptions={COMMON_SORT_OPTIONS}
          filteredCount={filteredCount}
          totalCount={totalCount}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4"><CardTitle>Pending registrations</CardTitle><CardDescription>{displayRows.length} awaiting review</CardDescription></CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>{['Party','Contact','Role','Email verified','Requested','Actions'].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {displayRows.length === 0 && totalCount > 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No registrations match your search or filters.
              </TableCell></TableRow>
            ) : null}
            {displayRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.label}</TableCell>
                <TableCell>
                  <div>{r.firstName} {r.lastName}</div>
                  <div className="text-sm text-secondary font-mono">{r.email}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={r.role === 'college_admin' ? 'indigo' : 'green'}>
                    {r.role === 'college_admin' ? 'College' : 'Employer'}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={r.emailVerified ? 'green' : 'amber'} showDot>
                      {r.emailVerified ? 'Yes' : 'Pending'}
                    </StatusBadge>
                    {!r.emailVerified && (
                      <StandardTableIconAction
                        action="resend"
                        variant="ghost"
                        loading={processing === r.id + 'resend'}
                        disabled={processing === r.id + 'resend'}
                        onClick={() => handleResendVerification(r.id)}
                        tooltip="Resend verification email"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <StandardTableIconAction
                      action="approve"
                      variant="success"
                      loading={processing === r.id + 'approve'}
                      disabled={processing === r.id + 'approve'}
                      onClick={() => act(r.id, 'approve')}
                    />
                    <StandardTableIconAction
                      action="reject"
                      variant="danger"
                      disabled={processing === r.id + 'reject'}
                      onClick={() => setRejectFor(r)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && totalCount === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No accounts awaiting approval.
              </TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejectFor)} onOpenChange={(open) => !open && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
                {rejectFor?.email} — optional note is emailed to the registrant.
            </DialogDescription>
          </DialogHeader>
              <Textarea
                rows={3}
                placeholder="Reason (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectFor(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!rejectFor || processing === rejectFor.id + 'reject'}
                onClick={() => rejectFor && act(rejectFor.id, 'reject', rejectNote)}
              >
                Confirm reject
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
