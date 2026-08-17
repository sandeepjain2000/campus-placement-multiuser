'use client';

import useSWR from 'swr';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { PartyPopper, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load events');
  return json;
};

export default function dt_Events() {
  const { data, isLoading, error } = useSWR('/api/college/events', fetcher);
  const events = Array.isArray(data?.events) ? data.events : [];

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayEvents,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(events, {
    getSearchText: (ev) => [ev.title, ev.event_type, ev.is_blocking ? 'blocking' : 'non-blocking'].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <PartyPopper className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Campus events
        </h1>
        <p className="text-muted-foreground m-0 text-sm">
          Review talks, pre-placement sessions, and other campus calendar events.
        </p>
      </div>

      {isLoading && <div className="skeleton skeleton-card h-48" />}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load events</AlertTitle>
          <AlertDescription>{error.message || 'Could not load events.'}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <Card className="gap-0 overflow-hidden py-0">
          {totalCount === 0 ? (
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div className="bg-primary/10 text-primary mb-4 flex size-16 items-center justify-center rounded-full">
                <CalendarDays className="size-7" />
              </div>
              <CardTitle className="mb-1 text-lg">No events scheduled</CardTitle>
              <CardDescription>
                Create events from the{' '}
                <Link href="/dashboard/college/calendar" className="text-primary font-medium">calendar</Link>.
              </CardDescription>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-border gap-3 border-b px-4 py-3">
                <div>
                  <CardTitle className="text-base">Event schedule</CardTitle>
                  <CardDescription>Showing {filteredCount} of {totalCount}</CardDescription>
                </div>
                <DataTableToolbar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search title or type…"
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Scheduling</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {displayEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                        No events match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayEvents.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">{ev.title || '—'}</TableCell>
                      <TableCell><StatusBadge tone="info">{ev.event_type || 'event'}</StatusBadge></TableCell>
                      <TableCell className="text-muted-foreground">{ev.start_date ? formatDate(ev.start_date) : '—'}</TableCell>
                      <TableCell>
                        <StatusBadge tone={ev.is_blocking ? 'warning' : 'neutral'} showDot>
                          {ev.is_blocking ? 'Blocking' : 'Non-blocking'}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
