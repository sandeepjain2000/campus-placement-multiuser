'use client';

import useSWR from 'swr';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import PageLoading from '@/components/PageLoading';
import CompanyNameLink from '@/components/CompanyNameLink';
import { CalendarDays, Users, CheckCircle2, Clock } from 'lucide-react';
import { formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { useInternshipResultsFilters } from './useInternshipResultsFilters';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load internship results');
  return data;
};

export default function mb_InternshipResults() {
  const { data, error, isLoading } = useSWR('/api/college/internship-results', fetcher);
  const results = Array.isArray(data?.results) ? data.results : [];
  const counts = data?.counts || { total: 0, selected: 0, pending: 0 };
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
    search,
    setSearch,
    filtered,
    filteredCount,
    hasActiveFilters,
    clearFilters,
    uniqueInternships,
  } = useInternshipResultsFilters(results);

  return (
    <>
      <MobileHeader title="Internship Results" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        {isLoading ? (
          <PageLoading message="Loading internship results…" variant="skeleton-list" inline />
        ) : error ? (
          <div className="card" style={{ padding: '1rem', color: 'var(--danger-600)', textAlign: 'center' }}>
            <p style={{ margin: 0 }}>{error.message || 'Could not load internship results.'}</p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              {[
                { label: 'Applicants', value: counts.total, icon: Users, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
                { label: 'Selected', value: counts.selected, icon: CheckCircle2, color: 'var(--success-600)', bg: 'var(--success-50)' },
                { label: 'Pending', value: counts.pending, icon: Clock, color: 'var(--warning-600)', bg: 'var(--warning-50)' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="card"
                  style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}
                >
                  <div style={{ padding: '0.4rem', borderRadius: '50%', background: bg, color }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 500 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gap: '0.65rem' }}>
              <input
                className="form-input"
                placeholder="Search student, company, internship…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="form-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">All companies</option>
                {filterOptions.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className="form-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">All internships</option>
                {uniqueInternships.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All results</option>
                  {filterOptions.statuses.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
                <select className="form-select" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                  <option value="">All branches</option>
                  {filterOptions.branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {filteredCount} student{filteredCount === 1 ? '' : 's'} shown
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CalendarDays size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>
                  {results.length === 0 ? 'No internship applications yet' : 'No students match filters'}
                </div>
                {results.length === 0 ? (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Link href="/dashboard/college/internships">View internship listings</Link>
                  </p>
                ) : null}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.map((row) => (
                  <div key={row.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{row.studentName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {row.rollNumber || '—'} · {row.systemId}
                        </div>
                      </div>
                      <span className={`badge badge-${getStatusColor(row.status)} badge-dot`} style={{ fontSize: '0.7rem' }}>
                        {formatStatus(row.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      {row.branch}
                      {row.cgpa != null ? ` · CGPA ${Number(row.cgpa).toFixed(2)}` : ''}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{row.openingTitle}</div>
                    <CompanyNameLink name={row.companyName} website={row.website} style={{ fontSize: '0.85rem' }} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                      Applied {row.appliedAt ? formatDate(row.appliedAt) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
