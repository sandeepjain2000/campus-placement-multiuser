'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { UserX, Building2, Briefcase, GraduationCap, Target } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import { formatDate } from '@/lib/utils';
import { resolveEmployerActiveCampus } from '@/lib/employerActiveCampus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TABS = [
  { id: 'internship', label: 'Internships', icon: GraduationCap },
  { id: 'jobs', label: 'Alumni Jobs', icon: Briefcase },
  { id: 'placement', label: 'Placement', icon: Target },
];

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
};

export default function EmployerFcfsUnavailablePage() {
  const [tenantId, setTenantId] = useState('');
  const [tab, setTab] = useState('internship');
  const [campusName, setCampusName] = useState('');

  useEffect(() => {
    resolveEmployerActiveCampus().then(({ active }) => {
      if (active?.id) {
        setTenantId(active.id);
        setCampusName(active.name || '');
      }
    });
  }, []);

  const swrKey = tenantId ? `/api/employer/fcfs-unavailable?tenantId=${tenantId}&tab=${tab}` : null;
  const { data, error, isLoading } = useSWR(swrKey, fetcher);

  const items = data?.items || [];
  const counts = data?.counts || {};

  const tabDesc = useMemo(() => {
    if (tab === 'internship') {
      return 'Students already confirmed for an internship by another employer (first-come, first-served).';
    }
    if (tab === 'placement') {
      return 'Students already confirmed on a placement drive by another employer.';
    }
    return 'Students already confirmed on a job posting by another employer.';
  }, [tab]);

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div>
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <UserX className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Unavailable candidates (FCFS)
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm leading-relaxed">
          {tabDesc} They are hidden from your applicant list and online assessment grid. CSV rows with{' '}
          <strong>Select</strong> for these students are rejected.
        </p>
        {campusName ? (
          <p className="text-muted-foreground mt-2 mb-0 flex items-center gap-1.5 text-sm">
            <Building2 className="size-4" /> Campus: <strong className="text-foreground">{campusName}</strong>
            {' · '}
            <Link className="text-primary underline underline-offset-2" href="/dashboard/employer/select-campus">Change campus</Link>
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 mb-0 text-sm">
            Select an active campus from <Link className="text-primary underline underline-offset-2" href="/dashboard/employer/select-campus">Campus partnerships</Link> first.
          </p>
        )}
      </div>

      <div className="bg-muted flex w-fit flex-wrap items-center gap-0.5 rounded-lg p-[3px]" role="tablist" aria-label="Candidate type">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const n = counts[t.id] ?? (active ? items.length : 0);
          return (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
            >
              <Icon data-icon="inline-start" />
              {t.label}
              <span className="text-muted-foreground text-xs font-semibold">({n})</span>
            </Button>
          );
        })}
      </div>

      {data?.fcfsEnabled === false && (
        <Alert>
          <AlertTitle>FCFS is disabled for this campus</AlertTitle>
          <AlertDescription>All students remain visible to every employer under the current college rules.</AlertDescription>
        </Alert>
      )}

      {!tenantId ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-12 text-center text-sm">Choose a campus to load unavailable candidates.</CardContent>
        </Card>
      ) : isLoading ? (
        <PageLoading message="Loading unavailable candidates…" variant="skeleton-list" inline />
      ) : error ? (
        <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
          <UserX className="text-muted-foreground mb-4 size-10 opacity-40" />
          <CardTitle className="text-lg">No unavailable candidates on this tab</CardTitle>
          <CardDescription className="mt-2">
            When another employer confirms a student first, they appear here.
          </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Confirmed by</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Via</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.studentProfileId}>
                    <TableCell className="font-medium">{row.studentName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.rollNumber || '—'}</TableCell>
                    <TableCell>{row.claimingEmployerName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.openingTitle || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{row.source === 'assessment' ? 'Assessment' : 'Applications'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.claimedAt ? formatDate(row.claimedAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground m-0 text-sm">
        Manage active pipelines under{' '}
        <Link className="text-primary underline underline-offset-2" href="/dashboard/employer/applications">Applications</Link>,{' '}
        <Link className="text-primary underline underline-offset-2" href="/dashboard/employer/assessment-update-online">Assessment update online</Link>, and{' '}
        <Link className="text-primary underline underline-offset-2" href="/dashboard/employer/assessment-uploads">CSV uploads</Link>.
      </p>
    </div>
  );
}
