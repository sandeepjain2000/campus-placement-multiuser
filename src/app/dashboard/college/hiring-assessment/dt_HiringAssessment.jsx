'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';
import { buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { useToast } from '@/components/ToastProvider';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { ClipboardList, Users, Upload, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CollegeHiringAssessmentPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch('/api/college/hiring-assessment-view');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        setLoadError(e?.message || 'Could not load assessment data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const baseDisplayRows = useMemo(() => pickRepresentativeAssessmentRows(rows), [rows]);
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(baseDisplayRows, {
    getSearchText: (r) =>
      [r.employer_company, r.original_file_name, r.roll_number, r.candidate_name, r.remarks].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });
  const summary = payload?.summary || buildAssessmentSummary(rows);

  const getCsv = useCallback(
    (_scope) => ({
      headers: [
        'employer_company',
        'upload_file',
        'upload_at',
        'roll_number',
        'candidate_name',
        'hiring_result',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.employer_company ?? '',
        r.original_file_name ?? '',
        r.upload_created_at ? new Date(r.upload_created_at).toISOString() : '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.hiring_result ?? '',
        r.remarks ?? '',
      ]),
    }),
    [displayRows],
  );

  const colCount = 6;

  const downloadOffersImportStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('CSV includes every campus master-list student (company prefilled from newest assessment when available).', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <ClipboardList className="text-muted-foreground size-7" /> Hiring assessment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Read-only view of employer CSV uploads for your campus. Export for spreadsheets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadOffersImportStarter}>
            <Download data-icon="inline-start" /> All students template
          </Button>
          <ExportCsvSplitButton filenameBase="hiring_assessment_college_view" currentCount={displayRows.length} fullCount={displayRows.length} getRows={getCsv} />
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card h-48" />
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load assessment data</AlertTitle>
          <AlertDescription>
            {loadError}{' '}
            If this mentions missing tables, apply migration <code>013_audit_exports_and_assessment_uploads.sql</code> on production.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment summary</CardTitle>
              <CardDescription>Most recent representative result per student.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap divide-x">
            {[
              { label: 'Total students', value: summary.uniqueStudentCount ?? 0, sub: summary.totalResultRows > 0 ? `${summary.totalResultRows} upload rows` : null, icon: Users },
              { label: 'Upload batches', value: summary.uploadsCount, sub: null, icon: Upload },
              { label: 'With hiring result', value: summary.withHiringResult ?? 0, sub: summary.withoutHiringResult ? `${summary.withoutHiringResult} pending` : null, icon: ClipboardList },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="flex min-w-48 flex-1 items-center gap-3 px-4 py-2 first:pl-0 last:pr-0">
                <Icon className="text-muted-foreground size-5" />
                <div><div className="text-xl font-semibold">{value}</div><div className="text-muted-foreground text-xs">{label}{sub ? ` · ${sub}` : ''}</div></div>
              </div>
            ))}
            </CardContent>
          </Card>

          <HiringResultBreakdown summary={summary} />

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">Student assessment detail</CardTitle>
              <CardDescription>
              <strong>Detail (read-only).</strong> One row per student; if the same roll appears in multiple assessment files, the <strong>most recent upload</strong>{' '}
              determines what you see here (older batches remain stored). <strong>Candidate</strong> is the name from your campus student master list for that roll (then
              email, then roll). CSV placeholders like &quot;Student_1&quot; are not shown here.
              </CardDescription>
            {totalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search employer, roll, or candidate…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            ) : null}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>File</TableHead><TableHead>Roll</TableHead><TableHead>Candidate</TableHead><TableHead>Hiring result</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                <TableBody>
                  {displayRows.length === 0 && totalCount > 0 ? (
                    <TableRow><TableCell colSpan={colCount} className="text-muted-foreground h-24 text-center">No rows match your search.</TableCell></TableRow>
                  ) : null}
                  {displayRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.employer_company || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.original_file_name || '—'}</TableCell>
                      <TableCell className="font-mono">{r.roll_number}</TableCell>
                      <TableCell>{r.candidate_name || '—'}</TableCell>
                      <TableCell><StatusBadge tone={r.hiring_result ? 'info' : 'neutral'}>{r.hiring_result || 'Pending'}</StatusBadge></TableCell>
                      <TableCell className="max-w-56">{r.remarks || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {totalCount === 0 ? (
                    <TableRow><TableCell colSpan={colCount} className="text-muted-foreground h-24 text-center">No assessment upload rows for your campus yet. When employers submit CSV results, they will appear here.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
