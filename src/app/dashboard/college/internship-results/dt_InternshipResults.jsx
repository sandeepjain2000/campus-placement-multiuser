'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import PageLoading from '@/components/PageLoading';
import Link from 'next/link';
import { CalendarDays, Download, Users, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import CompanyNameLink from '@/components/CompanyNameLink';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useInternshipResultsFilters } from './useInternshipResultsFilters';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load internship results');
  return data;
};

export default function CollegeInternshipResultsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading } = useSWR('/api/college/internship-results', fetcher);
  const results = Array.isArray(data?.results) ? data.results : [];
  const counts = data?.counts || { total: 0, selected: 0, shortlisted: 0, pending: 0 };
  const filterOptions = data?.filters || { companies: [], statuses: [], branches: [], batchYears: [] };

  const {
    companyId,
    setCompanyId,
    jobId,
    setJobId,
    statusFilter,
    setStatusFilter,
    branchFilter,
    setBranchFilter,
    batchFilter,
    setBatchFilter,
    search,
    setSearch,
    sort,
    setSort,
    filtered,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
    uniqueInternships,
  } = useInternshipResultsFilters(results);

  const exportCsv = () => {
    const header = [
      'Student',
      'Roll No.',
      'System ID',
      'Branch',
      'Batch',
      'CGPA',
      'Company',
      'Internship',
      'Result',
      'Applied',
      'Notes',
    ];
    const rows = filtered.map((row) => [
      row.studentName,
      row.rollNumber,
      row.systemId,
      row.branch,
      row.batchYear != null ? String(row.batchYear) : '',
      row.cgpa != null ? String(row.cgpa) : '',
      row.companyName,
      row.openingTitle,
      formatStatus(row.status),
      row.appliedAt ? formatDate(row.appliedAt) : '',
      row.notes || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'college_internship_results.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Internship results exported.', 'success');
  };

  const summaryLine = useMemo(() => {
    if (isLoading) return 'Loading student outcomes…';
    if (error) return 'Could not load results';
    if (!results.length) return 'No internship applications on record yet';
    return `${filteredCount} student${filteredCount === 1 ? '' : 's'} shown · ${counts.selected} selected · ${counts.shortlisted} shortlisted`;
  }, [isLoading, error, results.length, filteredCount, counts.selected, counts.shortlisted]);

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load internship results.'}</p>
        <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
          Confirm college admin access, then reload or contact support if this continues.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div
        style={{
          position: 'relative',
          background: 'var(--banner-gradient)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          color: 'white',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '2.25rem',
              fontWeight: 800,
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <CalendarDays size={28} /> Internship Results
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            Filter by company or internship, then review each student&apos;s application outcome.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={exportCsv}
            disabled={!filtered.length}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Download size={16} /> Export CSV
          </button>
          <Link
            href="/dashboard/college/internships"
            className="btn banner-cta-solid"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            View internship listings
          </Link>
        </div>
      </div>

      {isLoading ? (
        <PageLoading message="Loading internship results…" variant="skeleton-list" inline />
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Total applicants', value: counts.total, icon: Users, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
              { label: 'Selected', value: counts.selected, icon: CheckCircle2, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.08)' },
              { label: 'Pending / in progress', value: counts.pending, icon: Clock, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: bg, color }}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          <div
            className="card"
            style={{
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              border: '1px solid var(--border-default)',
            }}
          >
            <select
              className="form-select"
              style={{ minWidth: 180, padding: '0.65rem 2rem 0.65rem 1rem' }}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">All companies</option>
              {filterOptions.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ minWidth: 220, padding: '0.65rem 2rem 0.65rem 1rem' }}
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">All internships</option>
              {uniqueInternships.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.companyName} — {j.title}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ minWidth: 150, padding: '0.65rem 2rem 0.65rem 1rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All results</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ minWidth: 140, padding: '0.65rem 2rem 0.65rem 1rem' }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All branches</option>
              {filterOptions.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ minWidth: 120, padding: '0.65rem 2rem 0.65rem 1rem' }}
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="">All batches</option>
              {filterOptions.batchYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            {hasActiveFilters ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
            <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{summaryLine}</span>
          </div>

          {totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search student, roll, company, internship…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={[
                {
                  value: 'date_desc',
                  label: 'Applied (newest)',
                  compare: (a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0),
                },
                {
                  value: 'date_asc',
                  label: 'Applied (oldest)',
                  compare: (a, b) => new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0),
                },
                {
                  value: 'name_asc',
                  label: 'Student (A → Z)',
                  compare: (a, b) => a.studentName.localeCompare(b.studentName),
                },
              ]}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            />
          ) : null}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll / System ID</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Company</th>
                  <th>Internship</th>
                  <th>Result</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      {results.length === 0 ? (
                        <>
                          No students have applied to internships yet.{' '}
                          <Link href="/dashboard/college/internships">Review internship listings</Link> or ask students to apply.
                        </>
                      ) : (
                        'No students match the selected filters.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.studentName}</td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>{row.rollNumber || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{row.systemId}</div>
                      </td>
                      <td>{row.branch}</td>
                      <td>{row.cgpa != null ? Number(row.cgpa).toFixed(2) : '—'}</td>
                      <td>
                        <CompanyNameLink name={row.companyName} website={row.website} />
                      </td>
                      <td style={{ maxWidth: 220 }}>{row.openingTitle}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(row.status)} badge-dot`}>
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td>{row.appliedAt ? formatDate(row.appliedAt) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
