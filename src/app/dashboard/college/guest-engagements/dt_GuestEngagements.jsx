'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { Mic, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

const CSV_HEADERS = [
  'ID',
  'Type',
  'Title',
  'Summary',
  'Requirements',
  'Preferred timing',
  'Status',
  'Created',
  'Updated',
];

function listingToCsvRow(L) {
  return [
    L.id,
    KIND_LABEL[L.kind] || L.kind,
    L.title,
    L.summary || '',
    L.requirements || '',
    L.time_hint || '',
    L.status,
    L.created_at ? new Date(L.created_at).toISOString() : '',
    L.updated_at ? new Date(L.updated_at).toISOString() : '',
  ];
}

export default function CollegeGuestEngagementsPage() {
  const { addToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setListings(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/college/engagement-listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const filteredListings = useMemo(
    () =>
      listings.filter((L) => {
        if (kindFilter && L.kind !== kindFilter) return false;
        if (statusFilter && L.status !== statusFilter) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          String(L.title || '').toLowerCase().includes(q) ||
          String(L.summary || '').toLowerCase().includes(q) ||
          String(L.requirements || '').toLowerCase().includes(q)
        );
      }),
    [listings, kindFilter, statusFilter, search],
  );

  const getEngagementsCsv = useCallback(
    (scope) => {
      const list = scope === 'current' ? filteredListings : listings;
      return {
        headers: [...CSV_HEADERS],
        rows: list.map(listingToCsvRow),
      };
    },
    [filteredListings, listings],
  );

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Mic className="text-muted-foreground mt-0.5 size-7" aria-hidden />
          <div>
            <h1 className="text-foreground m-0 text-2xl font-semibold tracking-tight">Guest faculty & lectures</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {listings.length} listing{listings.length === 1 ? '' : 's'}
              {' · '}
              Published posts are visible to employer partners.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvSplitButton
            filenameBase="guest_engagements"
            currentCount={filteredListings.length}
            fullCount={listings.length}
            getRows={getEngagementsCsv}
          />
          <Button render={<Link href="/dashboard/college/guest-engagements/add" />}><Plus data-icon="inline-start" />Add</Button>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/college/overview" />}>Overview</Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            className="min-w-48 flex-1"
            placeholder="Filter by title, summary, requirements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <AdminFilterSelect
            id="guest-engagement-type"
            className="min-w-48"
            value={kindFilter}
            onValueChange={setKindFilter}
            items={[
              { label: 'All types', value: 'all' },
              { label: KIND_LABEL.guest_lecture, value: 'guest_lecture' },
              { label: KIND_LABEL.guest_faculty, value: 'guest_faculty' },
            ]}
          />
          <AdminFilterSelect
            id="guest-engagement-status"
            className="min-w-40"
            value={statusFilter}
            onValueChange={setStatusFilter}
            items={[
              { label: 'All statuses', value: 'all' },
              { label: 'Draft', value: 'draft' },
              { label: 'Published', value: 'published' },
              { label: 'Closed', value: 'closed' },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">Engagement listings</CardTitle>
          <CardDescription>Showing {filteredListings.length} of {listings.length}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              filteredListings.map((L) => (
                <TableRow key={L.id}>
                  <TableCell className="font-medium">{L.title}</TableCell>
                  <TableCell>{KIND_LABEL[L.kind] || L.kind}</TableCell>
                  <TableCell>
                    <StatusBadge tone={L.status === 'published' ? 'success' : L.status === 'draft' ? 'warning' : 'neutral'} showDot>
                      {formatStatus(L.status) || 'Draft'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {L.updated_at ? new Date(L.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {L.status !== 'published' ? (
                      <Button type="button" size="sm" onClick={() => setStatus(L.id, 'published')}>
                        Publish
                      </Button>
                    ) : null}
                    {L.status === 'published' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(L.id, 'closed')}
                      >
                        Close
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && filteredListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  {listings.length === 0 ? (
                    <>
                      No listings yet.{' '}
                      <Link href="/dashboard/college/guest-engagements/add">Add your first engagement</Link>.
                    </>
                  ) : (
                    'No listings match your filters.'
                  )}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
