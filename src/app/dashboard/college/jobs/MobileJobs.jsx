'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Briefcase, Building2, IndianRupee, BookOpen, Calendar } from 'lucide-react';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { useCollegeAcademicYearApiPath } from '@/lib/collegeAcademicYearContext';
import MobileHeader from '@/components/mobile/MobileHeader';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import { swrFetcher } from '@/lib/fetchJson';

function salaryLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${formatCurrency(Number(min))} - ${formatCurrency(Number(max))}/yr`;
  if (min != null) return `From ${formatCurrency(Number(min))}/yr`;
  return `Up to ${formatCurrency(Number(max))}/yr`;
}

export default function MobileJobs() {
  const jobsPath = useCollegeAcademicYearApiPath('/api/college/jobs');
  const { data, error, isLoading } = useSWR(jobsPath, swrFetcher);
  const list = useMemo(() => (Array.isArray(data?.jobs) ? data.jobs : []), [data]);

  const stats = useMemo(() => ({
    count: list.length,
    openings: list.reduce((s, r) => s + (parseInt(r.vacancies, 10) || 0), 0),
  }), [list]);

  return (
    <>
      <MobileHeader title="Jobs" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Published Jobs', value: isLoading ? '...' : stats.count, icon: Briefcase, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
            { label: 'Total Openings', value: isLoading ? '...' : stats.openings, icon: Building2, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: bg, color, width: 'fit-content', marginBottom: '1rem' }}><Icon size={20} /></div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--danger-500)', marginBottom: '1rem' }}>
            <p className="text-sm">Could not load jobs. Ensure you are signed in as a college admin and the database is configured.</p>
          </div>
        )}

        {isLoading && <PageLoading message="Loading jobs…" inline />}

        {!isLoading && !error && list.length === 0 && (
          <div className="card">
            <p className="text-secondary" style={{ margin: 0 }}>No published jobs for your campus yet.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {list.map((row) => (
            <div key={row.id} className="card card-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>{row.title}</h3>
                <span className="badge badge-indigo badge-dot">{formatStatus(row.job_type)}</span>
              </div>
              <span className="badge badge-gray badge-dot">
                <CompanyNameLink name={row.company_name} website={row.website} />
              </span>
              <p className="text-sm text-secondary" style={{ margin: '0.75rem 0', lineHeight: 1.5 }}>
                {(row.description || '').slice(0, 220)}
                {(row.description || '').length > 220 ? '...' : ''}
              </p>
              <div className="text-sm text-secondary" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IndianRupee size={14} aria-hidden /> Salary: {salaryLabel(row.salary_min, row.salary_max)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <BookOpen size={14} aria-hidden /> Min CGPA: {row.min_cgpa != null ? Number(row.min_cgpa) : '—'}
                </span>
                <span>Openings: {row.vacancies ?? '—'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} aria-hidden /> Posted {row.created_at ? formatDate(row.created_at) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
