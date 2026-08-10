'use client';

import Link from 'next/link';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Users, ClipboardList } from 'lucide-react';
import { downloadCollegeOffersTemplate } from '@/lib/collegeOffersCsvTemplate';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { swrFetcher } from '@/lib/fetchJson';
import { MAX_CSV_UPLOAD_BYTES, PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MAX_CSV_BYTES = MAX_CSV_UPLOAD_BYTES;

export function summarizeCsvErrors(errors) {
  const list = Array.isArray(errors) ? errors : [];
  if (!list.length) return '';
  const groups = new Map();
  for (const e of list) {
    const msg = String(e?.message || 'Unknown error').trim();
    const line = Number(e?.line || 0);
    if (!groups.has(msg)) groups.set(msg, []);
    groups.get(msg).push(line);
  }
  const top = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([msg, lines]) => {
      const preview = lines.slice(0, 3).filter((n) => Number.isFinite(n) && n > 0).join(', ');
      return `${msg} (${lines.length} row${lines.length > 1 ? 's' : ''}${preview ? `, lines: ${preview}` : ''})`;
    });
  return top.join(' | ');
}

export function useCollegeOffersUploadActions({ addToast, onUploadSuccess }) {
  const downloadAssessmentStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Template lists every student on your master list.', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  const onUploadCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lowerName = String(file.name || '').toLowerCase();
    if (!lowerName.endsWith('.csv')) {
      addToast('Please upload a .csv file.', 'warning');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      addToast(`CSV must be ${PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb || 5} MB or smaller.`, 'warning');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/college/offers/upload', { method: 'POST', credentials: 'same-origin', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const { accepted, errors } = json;
      addToast(
        `Imported ${accepted} row(s).${errors?.length ? ` ${errors.length} issue(s).` : ''}`,
        accepted ? 'success' : 'warning',
      );
      if (errors?.length) {
        addToast(summarizeCsvErrors(errors), 'error');
      }
      await onUploadSuccess?.();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    }
  };

  return { downloadAssessmentStarter, onUploadCsv, downloadBlankTemplate: downloadCollegeOffersTemplate };
}

export function CollegeOffersUploadMeta({ compact = false }) {
  const { data, error, isLoading } = useSWR('/api/college/offers/upload-meta', swrFetcher, {
    revalidateOnFocus: true,
  });

  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0 };
  const recent = Array.isArray(data?.recentOffers) ? data.recentOffers : [];
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRecent,
    filteredCount,
    totalCount: recentTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(recent, {
    getSearchText: (o) => [o.student_name, o.roll_number, o.company_name, o.job_title, o.status].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  if (isLoading) {
    return <div className={`skeleton rounded-xl ${compact ? 'h-24' : 'h-32'}`} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load offer summary</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className={`flex flex-wrap items-center gap-5 ${compact ? 'py-4' : 'py-5'}`}>
        <div className="flex min-w-36 items-center gap-3">
          <Users className="text-primary size-5" aria-hidden />
          <div>
            <div className="text-xl font-semibold leading-none">{data?.studentsWithRoll ?? 0}</div>
            <div className="text-muted-foreground mt-1 text-xs">Students with roll no.</div>
          </div>
        </div>
        <div className="bg-border h-9 w-px" aria-hidden />
        <div className="flex min-w-36 items-center gap-3">
          <ClipboardList className="text-primary size-5" aria-hidden />
          <div>
            <div className="text-xl font-semibold leading-none">{summary.total}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              Offers on file · {summary.pending} pending
            </div>
          </div>
        </div>
        {data?.assessmentPrefillCount > 0 ? (
          <>
            <div className="bg-border h-9 w-px" aria-hidden />
            <p className="text-muted-foreground m-0 max-w-72 text-xs leading-5">
              <strong>{data.assessmentPrefillCount}</strong> students can prefill <code>company_name</code> from your latest{' '}
              <Link href="/dashboard/college/hiring-assessment" className="text-primary font-medium">assessment upload</Link>.
            </p>
          </>
        ) : null}
        <Button render={<Link href="/dashboard/college/offers" />} variant="outline" size="sm" className="ml-auto">
          View all offers
        </Button>
        </CardContent>
      </Card>

      {recentTotalCount > 0 ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border gap-3 border-b px-4 py-3">
            <div>
            <CardTitle className="text-base">Recent offers</CardTitle>
            <CardDescription>
              Latest on your campus — edit on <Link href="/dashboard/college/offers">Offers</Link>.
            </CardDescription>
            </div>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search student, company, or role…"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={recentTotalCount}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead>
                <TableHead>CTC</TableHead><TableHead>Status</TableHead><TableHead>Added</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {displayRecent.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground h-24 text-center">No offers match your search.</TableCell></TableRow>
                ) : null}
                {displayRecent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell><div className="font-medium">{o.student_name || '—'}</div><div className="text-muted-foreground font-mono text-xs">{o.roll_number || '—'}</div></TableCell>
                    <TableCell>{o.company_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{o.job_title || '—'}</TableCell>
                    <TableCell>{o.salary ? formatCurrency(o.salary) : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge tone={getStatusColor(o.status)} showDot>
                        {formatStatus(o.status) || 'Pending'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{o.created_at ? formatDate(o.created_at) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-6 text-sm leading-6">
            No offers on file yet. Download a template below, fill in <code>roll_number</code>, <code>company_name</code>, and{' '}
            <code>job_title</code>, then upload — or add rows on the <Link href="/dashboard/college/offers">Offers</Link> screen.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

