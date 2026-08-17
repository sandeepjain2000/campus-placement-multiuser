'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';
import { useToast } from '@/components/ToastProvider';
import { pickRepresentativeAssessmentRows, buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { toCsvIsoDate } from '@/lib/csvExport';
import { shouldShowFilterCount } from '@/lib/filterBadgeLabel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const KIND_TABS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap },
  { id: 'drive', label: 'Drive', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderDot },
];

export default function EmployerHiringAssessmentPage() {
  const { addToast } = useToast();
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [kindTab, setKindTab] = useState('internship');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const campusFilterItems = useMemo(() => {
    if (campusesLoading) return [{ label: 'Loading…', value: '' }];
    if (approvedCampuses.length === 0) return [{ label: 'No approved campuses', value: '' }];
    return approvedCampuses.map((c) => ({
      label: `${c.name}${c.city ? ` (${c.city})` : ''}`,
      value: String(c.id),
    }));
  }, [approvedCampuses, campusesLoading]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
        const list = Array.isArray(json.colleges) ? json.colleges : [];
        const approved = list.filter((c) => String(c.approval_status || '').toLowerCase() === 'approved');
        if (!mounted) return;
        setApprovedCampuses(approved);
        if (approved.length && !selectedTenantId) {
          setSelectedTenantId(approved[0].id);
        }
      } catch (e) {
        if (!mounted) return;
        setApprovedCampuses([]);
        addToast(e.message || 'Could not load campuses', 'error');
      } finally {
        if (mounted) setCampusesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setPayload(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/employer/hiring-assessment-view?tenantId=${encodeURIComponent(selectedTenantId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        addToast(e.message || 'Could not load assessment view', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTenantId, addToast]);

  const allRows = Array.isArray(payload?.rows) ? payload.rows : [];

  const kindCounts = useMemo(() => {
    const counts = { internship: 0, jobs: 0, drive: 0, projects: 0 };
    for (const r of pickRepresentativeAssessmentRows(allRows)) {
      const k = r.opportunity_kind;
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return counts;
  }, [allRows]);

  const scopedRows = useMemo(
    () => allRows.filter((r) => r.opportunity_kind === kindTab),
    [allRows, kindTab],
  );

  const baseDisplayRows = useMemo(() => pickRepresentativeAssessmentRows(scopedRows), [scopedRows]);

  const summary = useMemo(() => buildAssessmentSummary(scopedRows), [scopedRows]);

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
      [r.system_id, r.roll_number, r.candidate_name, r.original_file_name, r.remarks].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const getCsv = useCallback(
    (_scope) => ({
      headers: [
        'upload_file',
        'upload_at',
        'campus',
        'system_id',
        'roll_number',
        'candidate_name',
        'employer_company',
        'hiring_result',
        'submission_status',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.original_file_name ?? '',
        toCsvIsoDate(r.upload_created_at),
        r.tenant_name ?? '',
        r.system_id ?? '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.employer_company ?? '',
        r.hiring_result ?? '',
        r.submission_status ?? 'draft',
        r.remarks ?? '',
      ]),
    }),
    [displayRows],
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Hiring Results Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvSplitButton
            filenameBase={`hiring_results_${kindTab}`}
            currentCount={displayRows.length}
            fullCount={displayRows.length}
            getRows={getCsv}
          />
        </div>
      </div>

      <Card className="mb-4"><CardContent>
        <Field className="max-w-[70ch]">
          <FieldLabel htmlFor="hiring-results-campus">
            Campus
          </FieldLabel>
          <AdminFilterSelect
            id="hiring-results-campus"
            className="h-9 w-full max-w-[70ch]"
            value={selectedTenantId}
            onValueChange={setSelectedTenantId}
            disabled={campusesLoading || approvedCampuses.length === 0}
            emptyMapsToAll={false}
            items={campusFilterItems}
          />
        </Field>
      </CardContent></Card>

      <Tabs value={kindTab} onValueChange={setKindTab} className="mb-6"><TabsList aria-label="Opportunity type">
        {KIND_TABS.map((t) => {
          const Icon = t.icon;
          const active = kindTab === t.id;
          const n = kindCounts[t.id] ?? 0;
          return (
            <TabsTrigger
              key={t.id}
              type="button"
              value={t.id}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
              {t.label}
              {shouldShowFilterCount(n) ? (
                <span
                  style={{
                    opacity: 0.85,
                    fontSize: '0.75rem',
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                    borderRadius: '999px',
                    padding: '0.1rem 0.45rem',
                    fontWeight: 700,
                    color: active ? 'white' : 'var(--text-tertiary)',
                  }}
                >
                  {n}
                </span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList></Tabs>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : (
        <>
          <Card className="mb-5"><CardContent className="flex flex-wrap gap-x-8 gap-y-3">
            <div><strong className="text-lg">{summary.uniqueStudentCount ?? 0}</strong> <span className="text-muted-foreground">students</span>
              <div className="text-xs text-muted-foreground">
                Distinct students (this campus · {KIND_TABS.find((t) => t.id === kindTab)?.label})
                {summary.totalResultRows > 0 ? (
                  <>
                    <br />
                    {summary.totalResultRows} row{summary.totalResultRows === 1 ? '' : 's'} across uploads
                  </>
                ) : null}
              </div>
            </div>
            <div><strong className="text-lg">{summary.uploadsCount}</strong> <span className="text-muted-foreground">upload batches</span>
              <div className="text-xs text-muted-foreground">
                Distinct CSV uploads represented
              </div>
            </div>
            <div><strong className="text-lg">{summary.withHiringResult ?? 0}</strong> <span className="text-muted-foreground">with hiring result</span>
              <div className="text-xs text-muted-foreground">
                {summary.withoutHiringResult ?? 0} with no decision yet
              </div>
            </div>
          </CardContent></Card>

          <HiringResultBreakdown summary={summary} />

          <Card>
            <CardHeader><CardTitle>Detail</CardTitle><CardDescription>Candidate-level results for the selected campus and opportunity type.</CardDescription></CardHeader>
            <CardContent>
            {totalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search roll, candidate, or file…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
              <Table className="min-w-[900px]">
                <TableHeader><TableRow>
                    <TableHead>File</TableHead><TableHead>System ID</TableHead><TableHead>Roll</TableHead><TableHead>Candidate</TableHead><TableHead>Hiring result</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {displayRows.length === 0 && totalCount > 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No rows match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {displayRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.original_file_name || '—'}</TableCell>
                      <TableCell className="font-mono">{r.system_id || '—'}</TableCell>
                      <TableCell className="font-mono">{r.roll_number || '—'}</TableCell>
                      <TableCell>{r.candidate_name || '—'}</TableCell>
                      <TableCell>{r.hiring_result || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.submission_status} showDot>
                          {r.submission_status || 'draft'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {r.remarks || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totalCount === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No assessment rows for this campus and type yet. Upload a CSV under{' '}
                        <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
