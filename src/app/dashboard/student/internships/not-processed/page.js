'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { GraduationCap, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

async function fetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function StudentNotProcessedInternshipsPage() {
  const { data, error, isLoading } = useSWR('/api/student/internships/not-processed', fetcher, {
    revalidateOnFocus: true,
  });

  const items = data?.items || [];
  const locked = data?.locked === true;
  const selected = data?.selectedInternship;

  const buildCsvRows = () => {
    const headers = ['Company', 'Role', 'Stipend (INR/mo)', 'Deadline', 'Reason'];
    const rows = items.map((row) => [
      row.companyName || '',
      row.title || '',
      row.salaryMin != null || row.salaryMax != null ? formatCurrency(row.salaryMin || row.salaryMax) : '',
      row.applicationDeadline ? formatDate(row.applicationDeadline) : '',
      row.notProcessedReason || 'Not processed after internship selection',
    ]);
    return { headers, rows };
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Lock className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
            Not Processed Internships
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Read-only list of internships you could not apply to after FCFS internship selection (max 1 per student).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 ? (
            <ExportCsvSplitButton
              filenameBase="not_processed_internships"
              currentCount={items.length}
              fullCount={items.length}
              getRows={buildCsvRows}
              size="sm"
            />
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            className="w-fit"
            render={<Link href="/dashboard/student/internships" />}
            nativeButton={false}
          >
            <GraduationCap data-icon="inline-start" />
            Browse internships
          </Button>
        </div>
      </div>

      {isLoading && !error ? <PageLoading message="Loading…" inline /> : null}

      {!isLoading && error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load list</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && !locked ? (
        <Alert>
          <AlertDescription>
            You are not locked by an internship selection yet. When a company selects you for an internship, other open
            internships you did not apply to will appear here.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && locked && selected ? (
        <Alert>
          <AlertTitle>Selected internship</AlertTitle>
          <AlertDescription>
            <strong>{selected.companyName}</strong> — {selected.title}. Other internships below were not processed
            because you cannot apply after selection.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && locked && items.length === 0 ? (
        <Card className="gap-0 py-10">
          <CardContent className="px-6 text-center">
            <CardDescription className="text-sm">
              No additional not-processed internships. You either applied to all other visible openings before selection,
              or no other internships were published for your campus.
            </CardDescription>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-1 border-b px-4 py-3">
            <CardTitle className="text-base">Not processed listings</CardTitle>
            <CardDescription>{items.length} internship{items.length === 1 ? '' : 's'}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="student-opportunities-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Stipend</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell data-label="Company">
                      <div className="flex min-w-0 items-center gap-2">
                        <EntityLogo name={row.companyName} size="sm" shape="rounded" />
                        <span className="truncate font-medium">
                          <CompanyNameLink name={row.companyName} website={row.website} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-label="Role" className="max-w-[12rem]">
                      <span className="block truncate">{row.title}</span>
                    </TableCell>
                    <TableCell data-label="Stipend" className="text-sm">
                      {row.salaryMin != null || row.salaryMax != null
                        ? `${formatCurrency(row.salaryMin || row.salaryMax)} /mo`
                        : '—'}
                    </TableCell>
                    <TableCell data-label="Deadline" className="text-sm">
                      {row.applicationDeadline ? formatDate(row.applicationDeadline) : '—'}
                    </TableCell>
                    <TableCell data-label="Reason" className="text-muted-foreground text-sm">
                      Not applied — blocked after FCFS selection
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
