'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { formatDate } from '@/lib/utils';
import { getCurrentAcademicYear } from '@/lib/academicYear';
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
  const [studentReportSearch, setStudentReportSearch] = useState('');
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
    const syncYear = () => {
      const saved = window.sessionStorage.getItem('activeAcademicYear');
      if (saved) setCurrentAcademicYear(saved);
    };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const studentEventCompanies = useMemo(
    () => Array.from(new Set(STUDENT_COMPANY_EVENTS.map((r) => r.company))).sort(),
    [STUDENT_COMPANY_EVENTS],
  );

  const filteredStudentEvents = useMemo(() => {
    const q = studentReportSearch.trim().toLowerCase();
    return STUDENT_COMPANY_EVENTS.filter((r) => {
      if (studentReportCompany && r.company !== studentReportCompany) return false;
      if (!q) return true;
      return (
        r.student.toLowerCase().includes(q) ||
        r.roll.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.eventType.toLowerCase().includes(q) ||
        r.outcome.toLowerCase().includes(q)
      );
    });
  }, [STUDENT_COMPANY_EVENTS, studentReportSearch, studentReportCompany]);

  const reportExports = useMemo(
    () => [
      {
        id: 'dept',
        label: 'Department-wise placement',
        filename: 'reports_department_placement',
        rowCount: DEPT_PLACEMENT.length,
        getRows: () => ({
          headers: ['Department', 'Placement_pct', 'Placed', 'Total'],
          rows: DEPT_PLACEMENT.map((d) => [
            d.dept,
            String(d.pct),
            String(d.placed),
            String(d.total),
          ]),
        }),
      },
      {
        id: 'salary',
        label: 'Salary distribution',
        filename: 'reports_salary_distribution',
        rowCount: SALARY_DIST.length,
        getRows: () => ({
          headers: ['Range', 'Students', 'Pct'],
          rows: SALARY_DIST.map((d) => [d.range, String(d.count), String(d.pct)]),
        }),
      },
      {
        id: 'recruiters',
        label: 'Top recruiters',
        filename: 'reports_top_recruiters',
        rowCount: TOP_RECRUITERS.length,
        getRows: () => ({
          headers: ['Rank', 'Company', 'Hires', 'Avg_CTC'],
          rows: TOP_RECRUITERS.map((c, i) => [
            String(i + 1),
            c.name,
            String(c.hires),
            c.ctc,
          ]),
        }),
      },
      {
        id: 'yoy',
        label: 'Year-over-year comparison',
        filename: 'reports_yoy_comparison',
        rowCount: YOY.length,
        getRows: () => ({
          headers: ['Metric', `Year_${previousAcademicYear.replace('-', '_')}`, `Year_${currentAcademicYear.replace('-', '_')}`, 'Change'],
          rows: YOY.map((r) => [r.metric, r.prev, r.curr, r.change]),
        }),
      },
      {
        id: 'student_events',
        label: 'Student–company events & outcomes',
        filename: 'reports_student_company_events',
        rowCount: STUDENT_COMPANY_EVENTS.length,
        getRows: () => ({
          headers: ['Student', 'Roll', 'Dept', 'Company', 'Event', 'Event_date', 'Attended', 'Outcome'],
          rows: STUDENT_COMPANY_EVENTS.map((r) => [
            r.student,
            r.roll,
            r.dept,
            r.company,
            r.eventType,
            r.eventDate,
            r.attended,
            r.outcome,
          ]),
        }),
      },
    ],
    [DEPT_PLACEMENT, SALARY_DIST, TOP_RECRUITERS, YOY, STUDENT_COMPANY_EVENTS, previousAcademicYear, currentAcademicYear]
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📈 Reports & Analytics</h1>
          <p>Comprehensive placement analytics and reports</p>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton mode="multi" exportMenus={reportExports} />
        </div>
      </div>

      {isLoading ? <div className="card"><p className="text-secondary">Loading reports...</p></div> : null}
      {error ? <div className="card"><p style={{ color: 'var(--danger-600)' }}>{error.message || 'Could not load reports.'}</p></div> : null}

      {/* Summary Cards */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card"><div className="stats-card-icon green">📊</div><div className="stats-card-value">{summary.placementRate}%</div><div className="stats-card-label">Placement Rate</div></div>
        <div className="stats-card green"><div className="stats-card-icon green">💰</div><div className="stats-card-value">{summary.avgPackage ? `₹${(summary.avgPackage / 100000).toFixed(1)}L` : '—'}</div><div className="stats-card-label">Average Package</div></div>
        <div className="stats-card amber"><div className="stats-card-icon amber">📈</div><div className="stats-card-value">{summary.highestPackage ? `₹${(summary.highestPackage / 100000).toFixed(1)}L` : '—'}</div><div className="stats-card-label">Highest Package</div></div>
        <div className="stats-card blue"><div className="stats-card-icon blue">🏢</div><div className="stats-card-value">{summary.companiesVisited || 0}</div><div className="stats-card-label">Companies Visited</div></div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">👤 Student-level: company events & results</h3>
          <p className="text-sm text-secondary" style={{ margin: '0.25rem 0 0', fontWeight: 400 }}>
            Who attended which company touchpoints (talks, tests, interviews) and the recorded outcome for that step.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            className="form-input"
            placeholder="Search student, roll, company, event, outcome…"
            value={studentReportSearch}
            onChange={(e) => setStudentReportSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={studentReportCompany} onChange={(e) => setStudentReportCompany(e.target.value)}>
            <option value="">All companies</option>
            {studentEventCompanies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-sm text-secondary">{filteredStudentEvents.length} rows</span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll</th>
                <th>Dept</th>
                <th>Company</th>
                <th>Event</th>
                <th>Date</th>
                <th>Attended</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudentEvents.map((r, idx) => (
                <tr key={`${r.roll}-${r.company}-${r.eventType}-${idx}`}>
                  <td className="font-semibold">{r.student}</td>
                  <td className="text-sm font-mono">{r.roll}</td>
                  <td>{r.dept}</td>
                  <td>{r.company}</td>
                  <td>{r.eventType}</td>
                  <td>{formatDate(r.eventDate)}</td>
                  <td>
                    <span className={`badge ${r.attended === 'Yes' ? 'badge-success' : r.attended === 'No' ? 'badge-gray' : 'badge-indigo'}`}>{r.attended}</span>
                  </td>
                  <td className="text-sm">{r.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Branch-wise Placement Chart */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Department-wise Placement Rate</h3></div>
          {DEPT_PLACEMENT.map(d => (
            <div key={d.dept} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="text-sm font-semibold">{d.dept}</span>
                <span className="text-sm">{d.placed}/{d.total} ({d.pct}%)</span>
              </div>
              <div className="progress-bar"><div className={`progress-fill ${d.pct >= 80 ? 'green' : d.pct >= 50 ? '' : 'red'}`} style={{ width: `${d.pct}%` }} /></div>
            </div>
          ))}
        </div>

        {/* Salary Distribution */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Salary Distribution</h3></div>
          {SALARY_DIST.map(d => (
            <div key={d.range} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span className="text-sm font-semibold">{d.range}</span>
                <span className="text-sm">{d.count} students ({d.pct}%)</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${d.pct * 2.5}%` }} /></div>
            </div>
          ))}
        </div>

        {/* Top Recruiters */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🏆 Top Recruiters</h3></div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Company</th><th>Hires</th><th>Avg CTC</th></tr></thead>
              <tbody>
                {TOP_RECRUITERS.map((c, i) => (
                  <tr key={c.name}><td className="font-bold">{i+1}</td><td className="font-semibold">{c.name}</td><td>{c.hires}</td><td className="font-bold">{c.ctc}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Year-over-Year */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Year-over-Year Comparison</h3></div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>Metric</th><th>{previousAcademicYear}</th><th>{currentAcademicYear}</th><th>Change</th></tr></thead>
              <tbody>
                {YOY.map(r => (
                  <tr key={r.metric}><td className="font-semibold">{r.metric}</td><td>{r.prev}</td><td className="font-bold">{r.curr}</td>
                    <td><span className={`stats-card-change ${r.up ? 'up' : 'down'}`}>{r.up ? '↑' : '↓'} {r.change}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
