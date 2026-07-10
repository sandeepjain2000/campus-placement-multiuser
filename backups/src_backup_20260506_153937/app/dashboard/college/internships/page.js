'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { GraduationCap, Building2, IndianRupee, BookOpen, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const fetcher = (url) => fetch(url).then((r) => r.json());

function stipendLabel(min, max) {
  if (min == null && max == null) return '—';
  if (min != null && max != null && Number(min) === Number(max)) {
    return `${formatCurrency(Number(min))}/mo`;
  }
  if (min != null && max != null) {
    return `${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}/mo`;
  }
  if (min != null) return `${formatCurrency(Number(min))}/mo`;
  return `${formatCurrency(Number(max))}/mo`;
}

export default function CollegeInternshipsPage() {
  const { data, error, isLoading } = useSWR('/api/college/internships', fetcher);

  const list = Array.isArray(data?.internships) ? data.internships : [];

  const stats = useMemo(() => {
    const n = list.length;
    let sum = 0;
    let count = 0;
    list.forEach((row) => {
      const a = row.salary_min != null ? Number(row.salary_min) : null;
      const b = row.salary_max != null ? Number(row.salary_max) : null;
      if (a != null && b != null) {
        sum += (a + b) / 2;
        count += 1;
      } else if (a != null) {
        sum += a;
        count += 1;
      } else if (b != null) {
        sum += b;
        count += 1;
      }
    });
    return {
      count: n,
      avgStipend: count ? Math.round(sum / count) : null,
      openings: list.reduce((s, r) => s + (parseInt(r.vacancies, 10) || 0), 0),
    };
  }, [list]);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <GraduationCap size={28} className="text-secondary" strokeWidth={1.5} /> Internships & programs
          </h1>
          <p className="text-secondary">
            Published internships, short projects, and hackathons for which your campus was selected when the employer published. Tied to{' '}
            <span className="font-mono text-xs">job_posting_visibility</span>, <span className="font-mono text-xs">job_postings</span>, and approved tie-ups.
          </p>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stats-card">
          <div className="stats-card-icon indigo"><GraduationCap size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">{isLoading ? '…' : stats.count}</div>
          <div className="stats-card-label">Posted listings</div>
        </div>
        <div className="stats-card green">
          <div className="stats-card-icon green"><IndianRupee size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">
            {stats.avgStipend != null ? formatCurrency(stats.avgStipend) : '—'}
          </div>
          <div className="stats-card-label">Avg monthly stipend (est.)</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-card-icon amber"><Building2 size={24} strokeWidth={1.5} /></div>
          <div className="stats-card-value">{isLoading ? '…' : stats.openings}</div>
          <div className="stats-card-label">Total openings listed</div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-500)', marginBottom: '1rem' }}>
          <p className="text-sm">Could not load internships. Ensure you are signed in as a college admin and the database is configured.</p>
        </div>
      )}

      {isLoading && <p className="text-sm text-secondary">Loading…</p>}

      {!isLoading && !error && list.length === 0 && (
        <div className="card">
          <p className="text-secondary" style={{ margin: 0 }}>
            No published listings for your campus yet. Partners must publish from Internships or Projects and include your college. Ensure migration <span className="font-mono text-xs">006</span> (visibility table) is applied.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {list.map((row) => (
          <div key={row.id} className="card card-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>{row.title}</h3>
                  {row.job_type && row.job_type !== 'internship' ? (
                    <span className="badge badge-amber badge-dot">{row.job_type === 'hackathon' ? 'Hackathon' : 'Short project'}</span>
                  ) : (
                    <span className="badge badge-indigo badge-dot">Internship</span>
                  )}
                  <span className="badge badge-gray badge-dot">{row.company_name}</span>
                </div>
                <p className="text-sm text-secondary" style={{ margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                  {(row.description || '').slice(0, 280)}
                  {(row.description || '').length > 280 ? '…' : ''}
                </p>
                <div className="text-sm text-secondary" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IndianRupee size={14} aria-hidden /> Stipend: {stipendLabel(row.salary_min, row.salary_max)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <BookOpen size={14} aria-hidden /> Min CGPA: {row.min_cgpa != null ? Number(row.min_cgpa) : '—'}
                  </span>
                  <span>Openings: {row.vacancies ?? '—'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} aria-hidden /> Posted {row.created_at ? formatDate(row.created_at) : '—'}
                  </span>
                </div>
                {row.skills_required?.length ? (
                  <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {row.skills_required.map((s) => (
                      <span key={s} className="badge badge-gray">{s}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              {row.website ? (
                <a
                  href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Company site
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
