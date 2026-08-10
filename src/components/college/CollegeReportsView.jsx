'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { BarChart2, Building2, DollarSign, TrendingUp, Trophy } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import DataTableToolbar from '@/components/DataTableToolbar';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { formatDate } from '@/lib/utils';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load reports');
  return json;
};

function ProgressRows({ rows, empty, value, detail }) {
  if (!rows.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const percent = Math.max(0, Math.min(100, Number(value(row)) || 0));
        return (
          <div key={row.dept || row.range}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="font-medium">{row.dept || row.range}</span>
              <span className="text-muted-foreground">{detail(row)}</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CollegeReportsView({ mobile = false }) {
  const { data, isLoading, error } = useSWR('/api/college/reports', fetcher);
  const deptPlacement = useMemo(() => Array.isArray(data?.deptPlacement) ? data.deptPlacement : [], [data?.deptPlacement]);
  const salaryDist = useMemo(() => Array.isArray(data?.salaryDist) ? data.salaryDist : [], [data?.salaryDist]);
  const topRecruiters = useMemo(() => Array.isArray(data?.topRecruiters) ? data.topRecruiters : [], [data?.topRecruiters]);
  const yoy = useMemo(() => Array.isArray(data?.yoy) ? data.yoy : [], [data?.yoy]);
  const studentEvents = useMemo(() => Array.isArray(data?.studentCompanyEvents) ? data.studentCompanyEvents : [], [data?.studentCompanyEvents]);
  const summary = data?.summary || { placementRate: 0, avgPackage: 0, highestPackage: 0, companiesVisited: 0 };
  const [company, setCompany] = useState('');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncYear = () => {
      const saved = window.sessionStorage.getItem('activeAcademicYear');
      if (saved) setAcademicYear(saved);
    };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const previousYear = useMemo(() => {
    const start = Number(academicYear.split('-')[0]) - 1;
    return Number.isFinite(start) ? `${start}-${String((start + 1) % 100).padStart(2, '0')}` : '';
  }, [academicYear]);
  const companies = useMemo(() => [...new Set(studentEvents.map((row) => row.company))].sort(), [studentEvents]);
  const companyEvents = useMemo(() => studentEvents.filter((row) => !company || row.company === company), [studentEvents, company]);
  const query = useDataTableQuery(companyEvents, {
    getSearchText: (row) => [row.student, row.roll, row.dept, row.company, row.eventType, row.outcome, row.attended].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const exports = useMemo(() => [
    { id: 'dept', label: 'Department-wise placement', filename: 'reports_department_placement', rowCount: deptPlacement.length, getRows: () => ({ headers: ['Department', 'Placement_pct', 'Placed', 'Total'], rows: deptPlacement.map((row) => [row.dept, String(row.pct), String(row.placed), String(row.total)]) }) },
    { id: 'salary', label: 'Salary distribution', filename: 'reports_salary_distribution', rowCount: salaryDist.length, getRows: () => ({ headers: ['Range', 'Students', 'Pct'], rows: salaryDist.map((row) => [row.range, String(row.count), String(row.pct)]) }) },
    { id: 'recruiters', label: 'Top recruiters', filename: 'reports_top_recruiters', rowCount: topRecruiters.length, getRows: () => ({ headers: ['Rank', 'Company', 'Hires', 'Avg_CTC'], rows: topRecruiters.map((row, index) => [String(index + 1), row.name, String(row.hires), row.ctc]) }) },
    { id: 'yoy', label: 'Year-over-year comparison', filename: 'reports_yoy_comparison', rowCount: yoy.length, getRows: () => ({ headers: ['Metric', previousYear, academicYear, 'Change'], rows: yoy.map((row) => [row.metric, row.prev, row.curr, row.change]) }) },
    { id: 'student_events', label: 'Student–company events & outcomes', filename: 'reports_student_company_events', rowCount: studentEvents.length, getRows: () => ({ headers: ['Student', 'Roll', 'Dept', 'Company', 'Event', 'Event_date', 'Attended', 'Outcome'], rows: studentEvents.map((row) => [row.student, row.roll, row.dept, row.company, row.eventType, row.eventDate, row.attended, row.outcome]) }) },
  ], [academicYear, deptPlacement, previousYear, salaryDist, studentEvents, topRecruiters, yoy]);

  const exportButton = <ExportCsvSplitButton mode="multi" exportMenus={exports} />;
  const main = (
    <main className="flex flex-col gap-6 pb-12">
      {!mobile ? (
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Placement season {academicYear}</p>
            <h1 className="font-heading flex items-center gap-2 text-3xl font-semibold tracking-tight"><BarChart2 aria-hidden />Reports &amp; analytics</h1>
            <p className="text-muted-foreground mt-1">Placement performance, recruiter outcomes, and exportable student activity.</p>
          </div>
          {exportButton}
        </header>
      ) : null}

      {isLoading ? <div className="bg-muted h-40 animate-pulse rounded-xl" /> : null}
      {error ? <Alert variant="destructive"><AlertTitle>Reports could not be loaded</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : null}

      {!isLoading && !error ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Season summary</CardTitle>
              <CardDescription>Core outcomes for {academicYear}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
              {[
                ['Placement rate', `${summary.placementRate}%`, TrendingUp],
                ['Average package', summary.avgPackage ? `₹${(summary.avgPackage / 100000).toFixed(1)}L` : '—', DollarSign],
                ['Highest package', summary.highestPackage ? `₹${(summary.highestPackage / 100000).toFixed(1)}L` : '—', TrendingUp],
                ['Companies visited', summary.companiesVisited || 0, Building2],
              ].map(([label, value, Icon]) => (
                <div key={label} className="flex items-center gap-3 p-4 first:pl-0">
                  <Icon className="text-muted-foreground" aria-hidden />
                  <div><div className="text-xl font-semibold">{value}</div><div className="text-muted-foreground text-xs">{label}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5">
              <CardTitle>Student-level events &amp; outcomes</CardTitle>
              <CardDescription>Attendance and outcomes across company touchpoints.</CardDescription>
              <AdminFilterSelect
                className="col-start-2 row-span-2 row-start-1 w-fit"
                aria-label="Filter by company"
                value={company}
                onValueChange={setCompany}
                items={[
                  { label: 'All companies', value: 'all' },
                  ...companies.map((name) => ({ label: name, value: name })),
                ]}
              />
            </CardHeader>
            {query.totalCount > 0 ? (
              <DataTableToolbar search={query.search} onSearchChange={query.setSearch} searchPlaceholder="Search student, company, or outcome…" sort={query.sort} onSortChange={query.setSort} sortOptions={COMMON_SORT_OPTIONS} filteredCount={query.filteredCount} totalCount={query.totalCount} hasActiveFilters={query.hasActiveFilters} onClear={query.clearFilters} />
            ) : null}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Roll</TableHead><TableHead>Dept</TableHead><TableHead>Company</TableHead><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Attended</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
                <TableBody>
                  {query.filtered.map((row, index) => (
                    <TableRow key={`${row.roll}-${row.company}-${row.eventType}-${index}`}>
                      <TableCell className="font-medium">{row.student}</TableCell><TableCell className="font-mono text-xs">{row.roll}</TableCell><TableCell>{row.dept}</TableCell><TableCell>{row.company}</TableCell>
                      <TableCell><StatusBadge tone="gray">{row.eventType}</StatusBadge></TableCell><TableCell>{formatDate(row.eventDate)}</TableCell>
                      <TableCell><StatusBadge tone={row.attended === 'Yes' ? 'green' : row.attended === 'No' ? 'gray' : 'indigo'} showDot>{row.attended || '—'}</StatusBadge></TableCell><TableCell>{row.outcome}</TableCell>
                    </TableRow>
                  ))}
                  {!query.filtered.length ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No matching activity found.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Department-wise placement</CardTitle></CardHeader><CardContent><ProgressRows rows={deptPlacement} empty="No department data yet." value={(row) => row.pct} detail={(row) => `${row.placed}/${row.total} (${row.pct}%)`} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Salary distribution</CardTitle></CardHeader><CardContent><ProgressRows rows={salaryDist} empty="No salary data yet." value={(row) => Math.min(100, row.pct * 2.5)} detail={(row) => `${row.count} students (${row.pct}%)`} /></CardContent></Card>
            <Card className="gap-0 py-0"><CardHeader className="border-b py-5"><CardTitle className="flex items-center gap-2"><Trophy aria-hidden />Top recruiters</CardTitle></CardHeader><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Hires</TableHead><TableHead className="text-right">Avg CTC</TableHead></TableRow></TableHeader><TableBody>{topRecruiters.map((row, index) => <TableRow key={row.name}><TableCell>{index + 1}</TableCell><TableCell className="font-medium">{row.name}</TableCell><TableCell className="text-right">{row.hires}</TableCell><TableCell className="text-right font-medium">{row.ctc}</TableCell></TableRow>)}</TableBody></Table></Card>
            <Card className="gap-0 py-0"><CardHeader className="border-b py-5"><CardTitle>Year-over-year comparison</CardTitle></CardHeader><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>{previousYear}</TableHead><TableHead>{academicYear}</TableHead><TableHead>Change</TableHead></TableRow></TableHeader><TableBody>{yoy.map((row) => <TableRow key={row.metric}><TableCell className="font-medium">{row.metric}</TableCell><TableCell>{row.prev}</TableCell><TableCell>{row.curr}</TableCell><TableCell><StatusBadge tone={row.up ? 'green' : 'red'} showDot>{row.up ? '↑' : '↓'} {row.change}</StatusBadge></TableCell></TableRow>)}</TableBody></Table></Card>
          </div>
        </>
      ) : null}
    </main>
  );

  return mobile ? <><MobileHeader title="Reports" action={exportButton} /><div className="px-4 pb-20 pt-4">{main}</div></> : main;
}
