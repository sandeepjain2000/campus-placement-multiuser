'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { formatDate } from '@/lib/utils';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import { BarChart2, TrendingUp, DollarSign, Building2, Trophy } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load reports');
  return json;
};

export default function CollegeReportsPage() {
  const { data, isLoading, error } = useSWR('/api/college/reports', fetcher);
  const DEPT_PLACEMENT = Array.isArray(data?.deptPlacement) ? data.deptPlacement : [];
  const SALARY_DIST = Array.isArray(data?.salaryDist) ? data.salaryDist : [];
  const TOP_RECRUITERS = Array.isArray(data?.topRecruiters) ? data.topRecruiters : [];
  const YOY = Array.isArray(data?.yoy) ? data.yoy : [];
  const STUDENT_COMPANY_EVENTS = Array.isArray(data?.studentCompanyEvents) ? data.studentCompanyEvents : [];
  const summary = data?.summary || { placementRate: 0, avgPackage: 0, highestPackage: 0, companiesVisited: 0 };
  const [studentReportCompany, setStudentReportCompany] = useState('');
  const [currentAcademicYear, setCurrentAcademicYear] = useState(getCurrentAcademicYear());

  const previousAcademicYear = useMemo(() => {
    const startYear = Number(currentAcademicYear.split('-')[0]);
    if (!Number.isFinite(startYear)) return '';
    const prevStart = startYear - 1;
    const prevEnd = String((prevStart + 1) % 100).padStart(2, '0');
    return `${prevStart}-${prevEnd}`;
  }, [currentAcademicYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncYear = () => { const saved = window.sessionStorage.getItem('activeAcademicYear'); if (saved) setCurrentAcademicYear(saved); };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const studentEventCompanies = useMemo(() => Array.from(new Set(STUDENT_COMPANY_EVENTS.map((r) => r.company))).sort(), [STUDENT_COMPANY_EVENTS]);
  const companyFilteredEvents = useMemo(
    () =>
      STUDENT_COMPANY_EVENTS.filter((r) => !studentReportCompany || r.company === studentReportCompany),
    [STUDENT_COMPANY_EVENTS, studentReportCompany],
  );
  const {
    search: studentReportSearch,
    setSearch: setStudentReportSearch,
    sort: studentReportSort,
    setSort: setStudentReportSort,
    filtered: filteredStudentEvents,
    filteredCount: studentEventsFilteredCount,
    totalCount: studentEventsTotalCount,
    hasActiveFilters: studentEventsHasActiveFilters,
    clearFilters: clearStudentEventsFilters,
  } = useDataTableQuery(companyFilteredEvents, {
    getSearchText: (r) => [r.student, r.roll, r.dept, r.company, r.eventType, r.outcome, r.attended].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const reportExports = useMemo(() => [
    { id: 'dept', label: 'Department-wise placement', filename: 'reports_department_placement', rowCount: DEPT_PLACEMENT.length, getRows: () => ({ headers: ['Department', 'Placement_pct', 'Placed', 'Total'], rows: DEPT_PLACEMENT.map((d) => [d.dept, String(d.pct), String(d.placed), String(d.total)]) }) },
    { id: 'salary', label: 'Salary distribution', filename: 'reports_salary_distribution', rowCount: SALARY_DIST.length, getRows: () => ({ headers: ['Range', 'Students', 'Pct'], rows: SALARY_DIST.map((d) => [d.range, String(d.count), String(d.pct)]) }) },
    { id: 'recruiters', label: 'Top recruiters', filename: 'reports_top_recruiters', rowCount: TOP_RECRUITERS.length, getRows: () => ({ headers: ['Rank', 'Company', 'Hires', 'Avg_CTC'], rows: TOP_RECRUITERS.map((c, i) => [String(i + 1), c.name, String(c.hires), c.ctc]) }) },
    { id: 'yoy', label: 'Year-over-year comparison', filename: 'reports_yoy_comparison', rowCount: YOY.length, getRows: () => ({ headers: ['Metric', `Year_${previousAcademicYear.replace('-', '_')}`, `Year_${currentAcademicYear.replace('-', '_')}`, 'Change'], rows: YOY.map((r) => [r.metric, r.prev, r.curr, r.change]) }) },
    { id: 'student_events', label: 'Student–company events & outcomes', filename: 'reports_student_company_events', rowCount: STUDENT_COMPANY_EVENTS.length, getRows: () => ({ headers: ['Student', 'Roll', 'Dept', 'Company', 'Event', 'Event_date', 'Attended', 'Outcome'], rows: STUDENT_COMPANY_EVENTS.map((r) => [r.student, r.roll, r.dept, r.company, r.eventType, r.eventDate, r.attended, r.outcome]) }) },
  ], [DEPT_PLACEMENT, SALARY_DIST, TOP_RECRUITERS, YOY, STUDENT_COMPANY_EVENTS, previousAcademicYear, currentAcademicYear]);

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div
        className="gradient-banner"
        style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'visible',
        marginBottom: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart2 size={28} /> Reports & Analytics
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            Placement season {currentAcademicYear} · Comprehensive analytics and exportable reports
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ExportCsvSplitButton mode="multi" exportMenus={reportExports} />
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      )}
      {error && <div className="card" style={{ padding: '1.5rem', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', marginBottom: '1.5rem' }}><p style={{ margin: 0, color: 'var(--danger-700)', fontWeight: 600 }}>{error.message}</p></div>}

      {/* Summary KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Placement Rate', value: `${summary.placementRate}%`, icon: TrendingUp, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.08)' },
          { label: 'Average Package', value: summary.avgPackage ? `₹${(summary.avgPackage / 100000).toFixed(1)}L` : '—', icon: DollarSign, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
          { label: 'Highest Package', value: summary.highestPackage ? `₹${(summary.highestPackage / 100000).toFixed(1)}L` : '—', icon: TrendingUp, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Companies Visited', value: summary.companiesVisited || 0, icon: Building2, color: 'var(--info-600)', bg: 'rgba(2,132,199,0.08)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: bg, color }}><Icon size={22} strokeWidth={2} /></div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Student-level Events */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border-default)', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-secondary)' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Student-Level Events & Outcomes</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Who attended which company touchpoints and the recorded outcome.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-select" style={{ width: 'auto' }} value={studentReportCompany} onChange={e => setStudentReportCompany(e.target.value)}>
              <option value="">All companies</option>
              {studentEventCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {studentEventsTotalCount > 0 ? (
          <DataTableToolbar
            search={studentReportSearch}
            onSearchChange={setStudentReportSearch}
            searchPlaceholder="Search student, company, or outcome…"
            sort={studentReportSort}
            onSortChange={setStudentReportSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={studentEventsFilteredCount}
            totalCount={studentEventsTotalCount}
            hasActiveFilters={studentEventsHasActiveFilters}
            onClear={clearStudentEventsFilters}
            style={{ margin: '1rem 1.25rem 0', border: '1px solid var(--border-default)' }}
          />
        ) : null}
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr style={{ background: 'var(--bg-secondary)' }}><th style={{ paddingLeft: '1.5rem' }}>Student</th><th>Roll</th><th>Dept</th><th>Company</th><th>Event</th><th>Date</th><th>Attended</th><th style={{ paddingRight: '1.5rem' }}>Outcome</th></tr></thead>
            <tbody>
              {filteredStudentEvents.map((r, idx) => (
                <tr key={`${r.roll}-${r.company}-${r.eventType}-${idx}`}>
                  <td style={{ paddingLeft: '1.5rem', fontWeight: 600 }}>{r.student}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.roll}</td>
                  <td style={{ fontSize: '0.9rem' }}>{r.dept}</td>
                  <td style={{ fontWeight: 500 }}>{r.company}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>{r.eventType}</span></td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatDate(r.eventDate)}</td>
                  <td><span className={`badge ${r.attended === 'Yes' ? 'badge-green' : r.attended === 'No' ? 'badge-gray' : 'badge-indigo'}`} style={{ fontSize: '0.75rem' }}>{r.attended}</span></td>
                  <td style={{ paddingRight: '1.5rem', fontSize: '0.9rem' }}>{r.outcome}</td>
                </tr>
              ))}
              {filteredStudentEvents.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>{studentEventsTotalCount > 0 ? 'No rows match your search.' : 'No data found.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Dept Placement */}
        <div className="card" style={{ border: '1px solid var(--border-default)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Department-wise Placement Rate</h3>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {DEPT_PLACEMENT.map(d => (
              <div key={d.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.dept}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: d.pct >= 80 ? 'var(--success-600)' : d.pct >= 50 ? 'var(--warning-600)' : 'var(--danger-600)' }}>{d.placed}/{d.total} ({d.pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: d.pct >= 80 ? 'var(--success-500)' : d.pct >= 50 ? 'var(--warning-500)' : 'var(--danger-500)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {DEPT_PLACEMENT.length === 0 && <p className="text-secondary text-sm" style={{ margin: 0 }}>No department data yet.</p>}
          </div>
        </div>

        {/* Salary Dist */}
        <div className="card" style={{ border: '1px solid var(--border-default)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Salary Distribution</h3>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {SALARY_DIST.map(d => (
              <div key={d.range}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.range}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.count} students ({d.pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, d.pct * 2.5)}%`, background: 'linear-gradient(90deg, var(--primary-500), var(--primary-600))', borderRadius: 999 }} />
                </div>
              </div>
            ))}
            {SALARY_DIST.length === 0 && <p className="text-secondary text-sm" style={{ margin: 0 }}>No salary data yet.</p>}
          </div>
        </div>

        {/* Top Recruiters */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} style={{ color: 'var(--warning-500)' }} />
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Top Recruiters</h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr style={{ background: 'var(--bg-secondary)' }}><th style={{ width: 40, paddingLeft: '1.5rem' }}>#</th><th>Company</th><th style={{ textAlign: 'right' }}>Hires</th><th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Avg CTC</th></tr></thead>
              <tbody>
                {TOP_RECRUITERS.map((c, i) => (
                  <tr key={c.name}>
                    <td style={{ paddingLeft: '1.5rem', fontWeight: 700, color: i === 0 ? 'var(--warning-600)' : 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.hires}</td>
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem', fontWeight: 700, color: 'var(--success-600)' }}>{c.ctc}</td>
                  </tr>
                ))}
                {TOP_RECRUITERS.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* YoY */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Year-over-Year Comparison</h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr style={{ background: 'var(--bg-secondary)' }}><th style={{ paddingLeft: '1.5rem' }}>Metric</th><th>{previousAcademicYear}</th><th>{currentAcademicYear}</th><th style={{ paddingRight: '1.5rem' }}>Change</th></tr></thead>
              <tbody>
                {YOY.map(r => (
                  <tr key={r.metric}>
                    <td style={{ paddingLeft: '1.5rem', fontWeight: 600 }}>{r.metric}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.prev}</td>
                    <td style={{ fontWeight: 700 }}>{r.curr}</td>
                    <td style={{ paddingRight: '1.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: r.up ? 'var(--success-600)' : 'var(--danger-600)' }}>{r.up ? '↑' : '↓'} {r.change}</span>
                    </td>
                  </tr>
                ))}
                {YOY.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No data yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
