'use client';

import useSWR from 'swr';
import { Building2, ClipboardList, GraduationCap } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  applicationKindLabel,
  computeApplicationStats,
  getApplicationKindMeta,
  getApplicationStatusMeta,
  openingLabel,
  studentInitials,
} from './applicationRowUtils';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load applications');
  return json;
};

export default function mb_Applications() {
  const { data, isLoading, error } = useSWR('/api/college/applications', fetcher);
  const applications = Array.isArray(data?.applications) ? data.applications : [];
  const counts = data?.counts || { drives: 0, programs: 0, total: 0 };
  const stats = computeApplicationStats(applications, counts);

  return (
    <>
      <MobileHeader title="Applications" />
      <div className="animate-fadeIn flex flex-col gap-4 px-4 pb-20 pt-4">
        {isLoading && !applications.length ? <PageLoading message="Loading applications…" inline /> : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load applications</AlertTitle>
            <AlertDescription>{error.message || 'Could not load applications.'}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !error && applications.length > 0 ? (
          <Alert>
            <AlertTitle>
              {stats.total} application{stats.total === 1 ? '' : 's'}
            </AlertTitle>
            <AlertDescription>
              {stats.drives} drives · {stats.programs} programs
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !error && applications.length === 0 ? (
          <Card className="gap-0 py-10">
            <CardContent className="flex flex-col items-center px-6 text-center">
              <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-full">
                <ClipboardList className="size-6" />
              </div>
              <CardTitle className="mb-1 text-base">No applications yet</CardTitle>
              <CardDescription className="text-sm">
                Students apply from placement drives, jobs, internships, and projects on their dashboard.
              </CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error && applications.length > 0 ? (
          <div className="flex flex-col gap-3">
            {applications.map((a) => {
              const kindMeta = getApplicationKindMeta(a);
              const statusMeta = getApplicationStatusMeta(a.status);
              const initials = studentInitials(a.student_name);
              return (
                <Card key={`${a.source_kind}-${a.id}`} size="sm" className="gap-3">
                  <CardHeader className="gap-2 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{a.student_name || '—'}</CardTitle>
                          <CardDescription className="font-mono">{a.roll_number || '—'}</CardDescription>
                        </div>
                      </div>
                      <StatusBadge status={a.status} tone={statusMeta.tone} showDot>
                        {statusMeta.label}
                      </StatusBadge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={kindMeta.tone} showDot>
                        {kindMeta.label || applicationKindLabel(a)}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 px-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <GraduationCap className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{a.department || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                      <CompanyNameLink name={a.company_name} website={a.company_website} />
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between gap-2 border-t pt-3 text-xs">
                      <span className="truncate">
                        {applicationKindLabel(a)} · {openingLabel(a)}
                      </span>
                      <span className="shrink-0">{a.applied_at ? formatDate(a.applied_at) : '—'}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
